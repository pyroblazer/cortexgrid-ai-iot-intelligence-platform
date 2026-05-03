/**
 * Registration Page (app/(auth)/register/page.tsx)
 *
 * WHAT: The sign-up form where new users create their CortexGrid account.
 *
 * WHY IT EXISTS: Before users can see their IoT dashboard, they need an account.
 *               This form collects all the info needed to create both a user
 *               AND their organization (company/workspace) in one step.
 *
 * Registration flow (step by step):
 *   1. User fills out 6 fields: first name, last name, email, organization, password, confirm password
 *   2. Zod validates everything on the client:
 *      - Names: must not be empty
 *      - Email: must be a valid email format
 *      - Organization: 2-100 characters
 *      - Password: at least 8 chars, must have uppercase + lowercase + digit
 *      - Confirm password: must match password (using zod's .refine())
 *   3. On submit, the form data is sent to the API via apiClient
 *   4. On success: redirect to /login?registered=true (shows a "check your email" or success message)
 *   5. On failure: show server error in a red banner
 *
 * Data flow:
 *   Form inputs -> zod validation -> apiClient.post("/api/auth/register") -> redirect to login
 *
 * Note: Unlike the login page which uses the auth store, registration calls the API directly
 * because the user isn't logged in yet -- there's no token to store.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, Building2 } from "lucide-react";
import { Button } from "@cortexgrid/ui/components/Button";
import { Input } from "@cortexgrid/ui/components/Input";
import { apiClient } from "@/lib/api-client";

// Registration validation schema.
// This is stricter than the login schema because we're creating a new user.
// The .refine() at the end adds a cross-field check: password must match confirmPassword.
const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    // Password requires a mix of character types for security.
    // The regex checks for at least one lowercase, one uppercase, and one digit.
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    organizationName: z
      .string()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name must be under 100 characters"),
  })
  // Cross-field validation: ensure both password fields match.
  // "path" tells zod to attach the error to the confirmPassword field specifically.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// TypeScript type derived from the zod schema -- keeps form types in sync with validation rules.
type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * RegisterPage - The account creation form.
 *
 * This component handles the entire registration flow:
 * - Form state management via react-hook-form
 * - Client-side validation via zod
 * - Server communication via apiClient
 * - Error display and success redirect
 */
export default function RegisterPage() {
  const router = useRouter();
  // Holds any error returned by the server (e.g., "Email already exists")
  const [serverError, setServerError] = useState<string | null>(null);

  // Set up react-hook-form with zod as the validation resolver.
  // All fields start empty -- the user fills them in from scratch.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      organizationName: "",
    },
  });

  /**
   * onSubmit - Sends the registration data to the API.
   *
   * Note: We combine firstName + lastName into a single "name" field before
   * sending to the API, because the backend expects one name string.
   *
   * On success, we redirect to login with a query param so the login page
   * can show a "Registration successful!" message.
   */
  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    try {
      // Combine first and last name into one string for the API
      const name = `${data.firstName} ${data.lastName}`;
      await apiClient.post("/auth/register", {
        name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        organizationName: data.organizationName,
      });
      // Redirect to login with a flag so the login page knows registration succeeded
      router.push("/login?registered=true");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div>
      {/* Header: shows logo on mobile, title and subtitle */}
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
          Create your account
        </h2>
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
          Get started with CortexGrid in minutes
        </p>
      </div>

      {/* Server error banner: shows API errors like "email already taken" */}
      {serverError && (
        <div
          className="mb-6 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {/* noValidate: disable browser's built-in validation so zod handles it all */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* First and last name side-by-side on a 2-column grid */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            placeholder="John"
            autoComplete="given-name"
            error={errors.firstName?.message}
            prefixIcon={<User />}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            placeholder="Doe"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          prefixIcon={<Mail />}
          {...register("email")}
        />

        {/* Organization name: each user creates their own organization on sign-up.
            This becomes their workspace where they'll add devices and team members. */}
        <Input
          label="Organization name"
          placeholder="Acme Corp"
          autoComplete="organization"
          error={errors.organizationName?.message}
          prefixIcon={<Building2 />}
          {...register("organizationName")}
        />

        {/* Password field with a helper text explaining the requirements.
            helperText is always visible (not an error) -- it guides the user
            before they make a mistake. */}
        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          error={errors.password?.message}
          prefixIcon={<Lock />}
          helperText="At least 8 characters with uppercase, lowercase, and a number"
          {...register("password")}
        />

        {/* Confirm password: the zod .refine() check ensures this matches the password above */}
        <Input
          label="Confirm password"
          type="password"
          placeholder="Confirm your password"
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Link back to login for users who already have an account */}
      <p className="mt-8 text-center text-sm text-dark-500 dark:text-dark-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
