import type { Metadata, Viewport } from "next";
import { Nunito, Quicksand, Fraunces } from "next/font/google";
import "./globals.css";
import { SyncProvider } from "@/components/sync-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { ToastContainer } from "@/components/toast";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Court Books",
  description: "Pickleball court booking for your facilities",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Court Books",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F8FAFC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${quicksand.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <SyncProvider>{children}</SyncProvider>
        <InstallPrompt />
        <ToastContainer />
      </body>
    </html>
  );
}
