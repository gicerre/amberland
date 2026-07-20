import type { Metadata, Viewport } from "next";
import { Caudex, Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/providers/app-providers";
import { Analytics } from "@vercel/analytics/next"

/* Tipografia Obsidian (DESIGN_SYSTEM_V3 §3):
   Cinzel = display (l'anima fantasy) · Inter = UI · Caudex = solo prosa lore. */
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const caudex = Caudex({
  subsets: ["latin"],
  variable: "--font-caudex",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Amberland — Le Cronache del Regno",
    template: "%s — Amberland",
  },
  description:
    "Il portale ufficiale della campagna Dungeons & Dragons Amberland: missioni, mondo, party e cronache del regno.",
  applicationName: "Amberland",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    title: "Amberland",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#060608",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`dark ${cinzel.variable} ${inter.variable} ${caudex.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        <Toaster position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
