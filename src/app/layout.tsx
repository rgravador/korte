import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SyncProvider } from "@/components/sync-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { ToastContainer } from "@/components/toast";

const sora = localFont({
  src: "./fonts/sora-variable.woff2",
  variable: "--font-display",
  display: "swap",
});

const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-400.woff2", weight: "400" },
    { path: "./fonts/plus-jakarta-sans-500.woff2", weight: "500" },
    { path: "./fonts/plus-jakarta-sans-600.woff2", weight: "600" },
    { path: "./fonts/plus-jakarta-sans-700.woff2", weight: "700" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Korte",
  description: "Pickleball court booking for your facilities",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Korte",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A1628",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${plusJakartaSans.variable} font-sans antialiased`}
      >
        <SyncProvider>{children}</SyncProvider>
        <InstallPrompt />
        <ToastContainer />
      </body>
    </html>
  );
}
