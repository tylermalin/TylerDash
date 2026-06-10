import type { Metadata, Viewport } from "next";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OS",
  description: "Operating state. Measured, not estimated.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
