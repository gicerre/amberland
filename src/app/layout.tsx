import type { Metadata, Viewport } from "next";
import { Caudex, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/providers/app-providers";
import { Analytics } from "@vercel/analytics/next"


const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
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
    <html lang="it" className={`dark ${cinzel.variable} ${caudex.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
        <Toaster position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
