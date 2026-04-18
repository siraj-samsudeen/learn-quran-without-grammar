"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  useCurrentUser,
  useIsAuthorizedMember,
  signOut,
  type CurrentUser,
  type AuthorizationState,
} from "@/lib/auth";

type AuthDecision =
  | "loading"
  | "render-children"
  | "redirect-login"
  | "signout-redirect";

export function computeAuthDecision(
  user: CurrentUser | null,
  isLoading: boolean,
  authz: AuthorizationState,
  pathname: string,
): AuthDecision {
  if (isLoading || authz === "loading") return "loading";
  if (!user) return pathname === "/login" ? "render-children" : "redirect-login";
  if (authz === "unauthorized") return pathname === "/login" ? "render-children" : "signout-redirect";
  return "render-children";
}

function CheckingSessionFrame() {
  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Checking session…
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const authz = useIsAuthorizedMember();
  const pathname = usePathname();
  const router = useRouter();

  const decision = computeAuthDecision(user, isLoading, authz, pathname);

  useEffect(() => {
    if (decision === "redirect-login") {
      router.replace("/login");
    } else if (decision === "signout-redirect") {
      signOut();
      router.replace("/login?reason=unauthorized");
    }
  }, [decision, router]);

  if (decision === "render-children") return <>{children}</>;
  return <CheckingSessionFrame />;
}
