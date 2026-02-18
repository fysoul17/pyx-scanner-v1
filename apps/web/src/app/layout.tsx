import type { Metadata } from "next";
import { Outfit, Azeret_Mono } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "400", "800", "900"],
  display: "swap",
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret-mono",
  subsets: ["latin"],
  weight: ["300", "500", "700"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scanner.pyxmate.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "PYX Scanner — The Trust Layer for AI",
    template: "%s — PYX Scanner",
  },
  description:
    "Every AI skill scanned server-side with Opus analysis. Results cannot be faked. Badge tied to commit hash — code changes, badge gone.",
  keywords: [
    "AI skill scanner",
    "AI skill security",
    "AI trust",
    "prompt injection detection",
    "Model Context Protocol",
    "skill security",
    "AI safety",
    "ClawHub",
  ],
  openGraph: {
    siteName: "PYX Scanner",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${azeretMono.variable}`} suppressHydrationWarning>
        <GoogleAnalytics />
        <RootProvider theme={{ defaultTheme: "light", forcedTheme: "light" }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
