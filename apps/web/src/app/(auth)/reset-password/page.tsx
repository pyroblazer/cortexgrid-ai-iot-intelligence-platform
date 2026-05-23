"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { apiClient } from "@/lib/api-client";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password. The link may have expired.";
      setServerError(message);
    }
  };

  if (!token) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <span className="text-lg font-bold text-white">C</span>
            </div>
            <span className="text-xl font-bold text-dark-900 dark:text-white">
              CortexGrid
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-center dark:border-danger-800 dark:bg-danger-900/20">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-danger-600 dark:text-danger-400" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Invalid reset link
          </h2>
          <p className="mt-2 text-sm text-dark-600 dark:text-dark-400">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <span className="text-xl font-bold text-dark-900 dark:text-white">
            CortexGrid
          </span>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-dark-900 dark:text-dark-50">
          Set new password
        </h2>
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
          Enter your new password below
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-success-200 bg-success-50 p-6 text-center dark:border-success-800 dark:bg-success-900/20">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-success-600 dark:text-success-400" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              Password reset successful
            </h3>
            <p className="mt-2 text-sm text-dark-600 dark:text-dark-400">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </div>
      ) : (
        <>
          {serverError && (
            <div
              className="mb-6 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="New password"
              type="password"
              placeholder="Enter new password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              prefixIcon={<Lock />}
              {...register("newPassword")}
            />

            <Input
              label="Confirm new password"
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              prefixIcon={<Lock />}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              {isSubmitting ? (
                "Resetting..."
              ) : (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Reset password
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
