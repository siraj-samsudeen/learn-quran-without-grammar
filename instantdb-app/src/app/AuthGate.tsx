"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, pathname, router]);

  if (!user && pathname !== "/login") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Checking session…
      </div>
    );
  }
  return <>{children}</>;
}
