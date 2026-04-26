import { redirect } from "next/navigation";

export default function HomePage() {
  const isAuthenticated = false;

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  redirect("/login");
}
