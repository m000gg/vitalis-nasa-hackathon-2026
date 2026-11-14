import type { Metadata } from "next";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import { MissionProvider } from "@/context/MissionContext";
import { AlertLayer } from "@/components/AlertLayer";

export const metadata: Metadata = {
  title: "Vitalis+ | Crew & Commander Space Health System",
  description:
    "Simple, barebones Next.js fullstack skeleton for Vitalis+ — Crew & Commander Ready-to-Act Space Health System covering all 5 NASA HRP Hazards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900">
        <AlertProvider>
          <MissionProvider>
            {children}
            <AlertLayer />
          </MissionProvider>
        </AlertProvider>
      </body>
    </html>
  );
}
