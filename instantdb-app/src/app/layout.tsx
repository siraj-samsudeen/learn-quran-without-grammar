import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import AuthGate from "./AuthGate";

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "LQWG — Teacher",
  description: "Learn Qur'an Without Grammar — teacher console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={amiri.variable}>
      <body className="bg-[#fafaf7] text-[#1a1a1a] min-h-screen">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
