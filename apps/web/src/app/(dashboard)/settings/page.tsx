"use client";

import { useState, useCallback } from "react";
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
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_VARIANT: Record<MembershipRole, "info" | "success" | "default" | "warning"> = {
  OWNER: "info",
  ADMIN: "success",
  MEMBER: "default",
  VIEWER: "warning",
};

const MOCK_MEMBERS: TeamMember[] = [
  { id: "mem-001", name: "John Doe", email: "john@acme.com", role: "OWNER" as MembershipRole, joinedAt: "2024-01-15T10:00:00Z" },
  { id: "mem-002", name: "Jane Smith", email: "jane@acme.com", role: "ADMIN" as MembershipRole, joinedAt: "2024-02-01T08:00:00Z" },
  { id: "mem-003", name: "Bob Wilson", email: "bob@acme.com", role: "MEMBER" as MembershipRole, joinedAt: "2024-02-20T14:00:00Z" },
  { id: "mem-004", name: "Alice Brown", email: "alice@acme.com", role: "VIEWER" as MembershipRole, joinedAt: "2024-03-10T09:00:00Z" },
];

const MOCK_INVITATIONS: TeamInvitation[] = [
  {
    id: "inv-001",
    email: "newuser@acme.com",
    role: "MEMBER" as MembershipRole,
    status: "PENDING" as InvitationStatus,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 604800000).toISOString(),
  },
];

const NOTIFICATION_PREFS = [
  { key: "alert_email", label: "Alert notifications via email", enabled: true },
  { key: "alert_inapp", label: "Alert notifications in-app", enabled: true },
  { key: "billing_email", label: "Billing notifications via email", enabled: true },
  { key: "system_email", label: "System notifications via email", enabled: false },
  { key: "weekly_digest", label: "Weekly telemetry digest", enabled: true },
  { key: "device_offline", label: "Device offline alerts", enabled: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "team" | "notifications">("general");
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("MEMBER" as MembershipRole);
  const [notifications, setNotifications] = useState(NOTIFICATION_PREFS);

  const handleToggleNotification = useCallback((key: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n))
    );
  }, []);

  const handleRemoveMember = useCallback((id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleInvite = useCallback(() => {
    setInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("MEMBER" as MembershipRole);
  }, []);

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
        <Badge variant={ROLE_VARIANT[row.role]} size="sm">
          {ROLE_LABELS[row.role]}
        </Badge>
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
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveMember(row.id);
            }}
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
        <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
          Organization Settings
        </h1>
        <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
          Manage your organization, team, and notification preferences
        </p>
      </div>

      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700">
        {(
          [
            { key: "general", label: "General", icon: <Building2 className="h-4 w-4" /> },
            { key: "team", label: "Team", icon: <Users className="h-4 w-4" /> },
            { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization name, logo, and general settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Organization Name"
              defaultValue="Acme Corp"
              placeholder="Enter organization name"
            />

            <Input
              label="Slug"
              defaultValue="acme-corp"
              placeholder="URL-friendly identifier"
              helperText="Used in URLs and API endpoints"
              prefixIcon={<LinkIcon className="h-4 w-4" />}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                Description
              </label>
              <textarea
                rows={3}
                defaultValue="IoT monitoring and analytics for industrial applications"
                className="w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500"
                placeholder="Describe your organization"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <Building2 className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <Button variant="outline" size="sm">
                  Upload Logo
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button leftIcon={<Save className="h-4 w-4" />}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
                Team Members
              </h2>
              <p className="text-sm text-dark-500 dark:text-dark-400">
                {members.length} members in your organization
              </p>
            </div>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Member
            </Button>
          </div>

          <DataTable
            columns={memberColumns}
            data={members}
            keyExtractor={(row) => row.id}
            pageSize={10}
          />

          {MOCK_INVITATIONS.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_INVITATIONS.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-dark-200 p-4 dark:border-dark-700"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-dark-400" />
                        <div>
                          <p className="text-sm font-medium text-dark-900 dark:text-dark-100">
                            {inv.email}
                          </p>
                          <p className="text-xs text-dark-500 dark:text-dark-400">
                            Role: {ROLE_LABELS[inv.role]} | Expires{" "}
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Modal
            open={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            title="Invite Team Member"
            description="Send an invitation to join your organization"
            actions={
              <>
                <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} leftIcon={<Mail className="h-4 w-4" />}>
                  Send Invitation
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-dark-700 dark:text-dark-300">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
                  className="h-10 w-full rounded-lg border border-dark-300 bg-white px-3 py-2 text-sm text-dark-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                >
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
            <CardDescription>
              Configure how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-dark-200 dark:divide-dark-700">
              {notifications.map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    {pref.key.includes("email") ? (
                      <Mail className="h-4 w-4 text-dark-400" />
                    ) : pref.key.includes("alert") ? (
                      <Shield className="h-4 w-4 text-dark-400" />
                    ) : (
                      <Bell className="h-4 w-4 text-dark-400" />
                    )}
                    <span className="text-sm text-dark-700 dark:text-dark-300">
                      {pref.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleNotification(pref.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                      pref.enabled ? "bg-primary-600" : "bg-dark-300 dark:bg-dark-600"
                    }`}
                    role="switch"
                    aria-checked={pref.enabled}
                    aria-label={pref.label}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        pref.enabled ? "translate-x-5.5" : "translate-x-0.5"
                      } mt-0.5`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button leftIcon={<Save className="h-4 w-4" />}>
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
