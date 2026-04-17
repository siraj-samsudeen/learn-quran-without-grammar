import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "LQWG — Teacher",
  description: "Learn Qur'an Without Grammar — teacher console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#fafaf7] text-[#1a1a1a] min-h-screen">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
