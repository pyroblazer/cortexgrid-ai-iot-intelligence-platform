import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout: storeLogout,
    refresh,
  } = useAuthStore();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      await login(email, password);
      router.push("/dashboard");
    },
    [login, router]
  );

  const handleLogout = useCallback(() => {
    storeLogout();
    router.push("/login");
  }, [storeLogout, router]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return false;
    }
    return true;
  }, [isAuthenticated, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    refresh,
    requireAuth,
  };
}
