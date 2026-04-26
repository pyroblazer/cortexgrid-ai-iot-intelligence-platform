/**
 * Login Page (app/(auth)/login/page.tsx)
 *
 * WHAT: The login form where users enter their email and password to sign in.
 *
 * WHY IT EXISTS: This is the gateway to the app. Unauthenticated users land here.
 *               It validates input on the client side before sending to the server,
 *               shows clear error messages, and redirects to the dashboard on success.
 *
 * Form validation flow (step by step):
 *   1. User types into the email and password fields
 *   2. react-hook-form tracks the input values and touched state
 *   3. When the user clicks "Sign in", zod validates the form:
 *      - Email must not be empty and must look like a real email
 *      - Password must not be empty and must be at least 8 characters
 *   4. If validation passes, onSubmit() fires:
 *      a. It calls the auth store's login() method (which hits the API)
 *      b. On success: redirect to /dashboard
 *      c. On failure: show the error in a red banner above the form
 *   5. The "noValidate" attribute on the <form> disables the browser's built-in
 *      validation popups so we can show our own styled error messages instead.
 *
 * Data flow:
 *   User input -> react-hook-form -> zod validation -> auth store login() -> API call
 *   -> success: redirect to dashboard / failure: show error banner
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { useAuthStore } from "@/stores/auth-store";

// Zod schema: defines the validation rules for the login form.
// Think of it as a bouncer at a club -- it checks that the inputs meet the requirements
// before they're allowed through to the server.
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

// TypeScript type automatically derived from the zod schema above.
// This ensures the form values match the validation rules exactly.
type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * LoginPage - The sign-in form component.
 *
 * This page uses a two-layer validation strategy:
 * 1. Client-side: zod checks the format of email/password before sending to server
 * 2. Server-side: the API verifies the credentials are actually correct
 *
 * Only client-side errors show inline under each field.
 * Server-side errors (wrong password, user not found) show in the red banner at top.
 */
export default function LoginPage() {
  const router = useRouter();
  // Pull the login function from the global auth store (Zustand).
  // This store holds the user's session state and tokens.
  const login = useAuthStore((s) => s.login);
  // Holds error messages returned from the server (e.g., "Invalid credentials")
  const [serverError, setServerError] = useState<string | null>(null);

  // react-hook-form setup: connects form inputs to validation and state tracking.
  // zodResolver bridges zod's validation with react-hook-form's validation system.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /**
   * onSubmit - Called when the form passes zod validation and the user clicks "Sign in".
   *
   * Steps:
   * 1. Clear any previous server error
   * 2. Call the auth store's login() which sends credentials to the API
   * 3. On success: navigate to the dashboard
   * 4. On failure: display the error message from the server
   */
  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      // Login succeeded -- send the user to their dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      // Extract the error message if it's a proper Error, otherwise use a generic message
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      setServerError(message);
    }
  };

  return (
    <div>
      {/* Header section: shows the CortexGrid logo (on mobile) and a welcome message */}
      <div className="mb-8">
        {/* Logo only shows on small screens (lg:hidden).
            On larger screens, the logo is already visible in the auth layout shell. */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <span className="text-xl font-bold text-dark-900 dark:text-white">
            CortexGrid
          </span>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-dark-900 dark:text-dark-50">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
          Enter your credentials to access your dashboard
        </p>
      </div>

      {/* Server error banner: only shown when the API returns an error.
          role="alert" tells screen readers to announce this message immediately. */}
      {serverError && (
        <div
          className="mb-6 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {/* noValidate disables the browser's default validation so zod handles it all */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email input: react-hook-form's register() connects this input to the form state.
            errors.email?.message will show the zod validation message if validation fails. */}
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          prefixIcon={<Mail />}
          {...register("email")}
        />

        {/* Password input: same pattern as email, but with type="password" to hide characters */}
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          prefixIcon={<Lock />}
          {...register("password")}
        />

        {/* Row with "Remember me" checkbox and "Forgot password?" link */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600"
            />
            <span className="text-dark-600 dark:text-dark-400">
              Remember me
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit button: shows a loading state while the API request is in progress.
            "loading" prop disables the button and shows a spinner automatically. */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isSubmitting}
        >
          {isSubmitting ? (
            "Signing in..."
          ) : (
            <>
              <Loader2 className="mr-2 h-4 w-4" />
              Sign in
            </>
          )}
        </Button>
      </form>

      {/* Link to the registration page for users who don't have an account yet */}
      <p className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
