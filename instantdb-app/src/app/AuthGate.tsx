"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser, useIsAuthorizedMember, signOut } from "@/lib/auth";

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

  useEffect(() => {
    if (isLoading || authz === "loading") return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (user && authz === "unauthorized" && pathname !== "/login") {
      signOut();
      router.replace("/login?reason=unauthorized");
    }
  }, [user, isLoading, authz, pathname, router]);

  if (isLoading || authz === "loading") return <CheckingSessionFrame />;
  if (!user && pathname !== "/login") return <CheckingSessionFrame />;
  if (user && authz === "unauthorized" && pathname !== "/login") return <CheckingSessionFrame />;
  return <>{children}</>;
}
