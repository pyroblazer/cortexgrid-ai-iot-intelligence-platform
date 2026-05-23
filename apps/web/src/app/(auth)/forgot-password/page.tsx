"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { apiClient } from "@/lib/api-client";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      await apiClient.post("/auth/forgot-password", { email: data.email });
      setEmailSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setServerError(message);
    }
  };

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
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {emailSent ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-success-200 bg-success-50 p-6 text-center dark:border-success-800 dark:bg-success-900/20">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-success-600 dark:text-success-400" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
              Check your email
            </h3>
            <p className="mt-2 text-sm text-dark-600 dark:text-dark-400">
              If an account exists with that email, you&apos;ll receive a password reset link shortly.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
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
              label="Email address"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email?.message}
              prefixIcon={<Mail />}
              {...register("email")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Send reset link
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
