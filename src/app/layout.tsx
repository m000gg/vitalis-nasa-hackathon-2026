import type { Metadata } from "next";
import { Anonymous_Pro, Audiowide, Roboto } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/context/AlertContext";
import { MissionProvider } from "@/context/MissionContext";
import { AlertLayer } from "@/components/AlertLayer";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

const audiowide = Audiowide({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-audiowide",
  display: "swap",
});

const anonymousPro = Anonymous_Pro({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-anonymous-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vitalis+ | Orbital Crew Health Telemetry",
  description:
    "Vitalis+ — Deep-Space Crew & Commander Health Telemetry covering all 5 NASA HRP Hazards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${roboto.variable} ${audiowide.variable} ${anonymousPro.variable}`}
    >
      <body className="space-backdrop min-h-screen bg-[#050811] text-[#F8FAFC] antialiased selection:bg-[#3B82F6]/30 selection:text-white">
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
