"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Save,
  Plus,
  Trash2,
  Shield,
  Bell,
  Mail,
  Users,
  Building2,
  Link as LinkIcon,
  Lock,
  CheckCircle,
  Upload,
} from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { Badge } from "@cortexgrid/ui/components/Badge";
import { Modal } from "@cortexgrid/ui/components/Modal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@cortexgrid/ui/components/Card";
import { DataTable, type Column } from "@cortexgrid/ui/components/DataTable";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole, InvitationStatus } from "@cortexgrid/types";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MembershipRole;
  joinedAt: string;
  avatarUrl?: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member", VIEWER: "Viewer",
};

const ROLE_VARIANT: Record<MembershipRole, "info" | "success" | "default" | "warning"> = {
  OWNER: "info", ADMIN: "success", MEMBER: "default", VIEWER: "warning",
};

const DEFAULT_NOTIF_PREFS = [
  { key: "alertCritical", label: "Critical alerts", enabled: true },
  { key: "alertWarning", label: "Warning alerts", enabled: true },
  { key: "billing", label: "Billing notifications", enabled: true },
  { key: "system", label: "System notifications", enabled: false },
  { key: "weeklyReport", label: "Weekly telemetry digest", enabled: true },
  { key: "deviceOffline", label: "Device offline alerts", enabled: true },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const org = (user as any)?.memberships?.[0]?.organization;

  const [activeTab, setActiveTab] = useState<"general" | "team" | "notifications" | "security">("general");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIF_PREFS);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState(org?.name ?? "");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("MEMBER" as MembershipRole);
  const [profileForm, setProfileForm] = useState({ firstName: (user as any)?.firstName ?? "", lastName: (user as any)?.lastName ?? "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersResult, invitationsResult, prefsResult] = await Promise.all([
        apiClient.get<{ data: any[] }>("/organizations/current/members").catch(() => null),
        apiClient.get<{ data: any[] }>("/organizations/current/invitations").catch(() => null),
        apiClient.get<{ data: Record<string, boolean> }>("/notifications/preferences").catch(() => null),
      ]);

      if (membersResult?.data) {
        setMembers(
          membersResult.data.map((m: any) => ({
            id: m.id,
            name: m.user ? `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || m.user.email : "Unknown",
            email: m.user?.email ?? "",
            role: m.role,
            joinedAt: m.createdAt,
          }))
        );
      }

      if (invitationsResult?.data) {
        setInvitations(
          invitationsResult.data.map((inv: any) => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            status: inv.status ?? "PENDING",
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
          }))
        );
      }

      if (prefsResult?.data) {
        const prefs = prefsResult.data;
        setNotifications((prev) =>
          prev.map((p) => ({
            ...p,
            enabled: prefs[p.key] ?? p.enabled,
          }))
        );
      }
    } catch {
      // Data fetch failed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleNotification = useCallback((key: string) => {
    setNotifications((prev) => prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n)));
  }, []);

  const handleSavePreferences = useCallback(async () => {
    try {
      const prefs: Record<string, boolean> = {};
      notifications.forEach((n) => { prefs[n.key] = n.enabled; });
      await apiClient.put("/notifications/preferences", { preferences: prefs });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save preferences");
    }
  }, [notifications]);

  const handleRemoveMember = useCallback(async (id: string) => {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await apiClient.delete(`/organizations/current/members/${id}`);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  }, []);

  const handleInvite = useCallback(async () => {
    try {
      await apiClient.post("/organizations/current/invite", {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("MEMBER" as MembershipRole);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send invitation");
    }
  }, [inviteEmail, inviteRole, fetchData]);

  const handleSaveOrg = useCallback(async () => {
    try {
      await apiClient.patch("/organizations/current", { name: orgName });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save organization");
    }
  }, [orgName]);

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true);
    try {
      await apiClient.patch("/auth/me", { firstName: profileForm.firstName, lastName: profileForm.lastName });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }, [profileForm]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await apiClient.patch("/auth/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }, [passwordForm]);

  const memberColumns: Column<TeamMember>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {row.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-100">{row.name}</p>
            <p className="text-xs text-dark-500 dark:text-dark-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge variant={ROLE_VARIANT[row.role]} size="sm">{ROLE_LABELS[row.role]}</Badge>
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      render: (row) => new Date(row.joinedAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.role !== ("OWNER" as MembershipRole) ? (
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRemoveMember(row.id); }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20"
            aria-label={`Remove ${row.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">Organization Settings</h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">Manage your organization, team, and notification preferences</p>
      </div>

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700">
        {([
          { key: "general", label: "General", icon: <Building2 className="h-4 w-4" /> },
          { key: "team", label: "Team", icon: <Users className="h-4 w-4" /> },
          { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
          { key: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={profileForm.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
              <Input label="Last Name" value={profileForm.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
            </div>
            <Input label="Email" value={(user as any)?.email ?? ""} disabled helperText="Email cannot be changed" />
            <div className="flex justify-end pt-2">
              <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Update your organization name and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input label="Organization Name" value={orgName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrgName(e.target.value)} placeholder="Enter organization name" />
            <Input label="Slug" defaultValue={org?.slug ?? ""} placeholder="URL-friendly identifier" helperText="Used in URLs and API endpoints" prefixIcon={<LinkIcon className="h-4 w-4" />} disabled />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">Logo</label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      const response = await fetch("/api/uploadthing/upload", {
                        method: "POST",
                        body: formData,
                      });
                      if (!response.ok) throw new Error("Upload failed");
                      const result = await response.json();
                      if (result?.[0]?.url) {
                        await apiClient.patch("/organizations/current", { logoUrl: result[0].url });
                        alert("Logo uploaded successfully!");
                      }
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Upload failed");
                    }
                  };
                  input.click();
                }}>Upload Logo</Button>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSaveOrg}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">Team Members</h2>
              <p className="text-sm text-dark-500 dark:text-dark-400">{members.length} members in your organization</p>
            </div>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setInviteModalOpen(true)}>Invite Member</Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : (
            <DataTable columns={memberColumns} data={members} keyExtractor={(row) => row.id} pageSize={10} />
          )}

          {invitations.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-dark-200 p-4 dark:border-dark-700">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-dark-400" />
                        <div>
                          <p className="text-sm font-medium text-dark-900 dark:text-dark-100">{inv.email}</p>
                          <p className="text-xs text-dark-500 dark:text-dark-400">Role: {ROLE_LABELS[inv.role]} | Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">Pending</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member" description="Send an invitation to join your organization"
            actions={
              <>
                <Button variant="outline" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} leftIcon={<Mail className="h-4 w-4" />} disabled={!inviteEmail.trim()}>Send Invitation</Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input label="Email Address" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">Role</label>
                <select value={inviteRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value as MembershipRole)} className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100">
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Configure how and when you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-dark-200 dark:divide-dark-700">
              {notifications.map((pref) => (
                <div key={pref.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    {pref.key.includes("alert") || pref.key.includes("device") ? (
                      <Shield className="h-4 w-4 text-dark-400" />
                    ) : pref.key.includes("billing") ? (
                      <Mail className="h-4 w-4 text-dark-400" />
                    ) : (
                      <Bell className="h-4 w-4 text-dark-400" />
                    )}
                    <span className="text-sm text-dark-700 dark:text-dark-300">{pref.label}</span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification(pref.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      pref.enabled ? "bg-primary-600" : "bg-dark-300 dark:bg-dark-600"
                    }`}
                    role="switch" aria-checked={pref.enabled} aria-label={pref.label}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      pref.enabled ? "translate-x-5.5" : "translate-x-0.5"
                    } mt-0.5`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSavePreferences}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "security" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/20 dark:text-success-400">
                <CheckCircle className="h-4 w-4" />
                Password changed successfully
              </div>
            )}
            {passwordError && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                {passwordError}
              </div>
            )}
            <Input
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="Enter new password (min 8 characters)"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
            />
            <div className="flex justify-end pt-2">
              <Button
                leftIcon={<Lock className="h-4 w-4" />}
                onClick={handleChangePassword}
                disabled={passwordSaving || !passwordForm.currentPassword || !passwordForm.newPassword}
              >
                {passwordSaving ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
