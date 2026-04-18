"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth";

function CheckingSessionFrame() {
  return (
    <div className="flex items-center justify-center h-screen text-gray-500">
      Checking session…
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) return <CheckingSessionFrame />;
  if (!user && pathname !== "/login") return <CheckingSessionFrame />;
  return <>{children}</>;
}
