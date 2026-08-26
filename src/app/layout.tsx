import type { Metadata, Viewport } from "next";
import { Inter, Gelasio } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* Gelasio is metric-compatible with Georgia, which the DeanVerse workspace
   uses for serif headings. It keeps that identity stable off-desktop. */
const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-admin-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DeanVerse AI — Personal Command Center",
  description:
    "DeanVerse AI is a personal intelligence layer that plans your day, tracks your commitments, and keeps you ahead of what matters.",
  applicationName: "DeanVerse AI",
  appleWebApp: {
    capable: true,
    title: "DeanVerse AI",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#040a08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${gelasio.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="app-ambient" aria-hidden />
        {children}
      </body>
    </html>
  );
}
