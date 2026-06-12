import type { Metadata, Viewport } from "next";
import { Cinzel, Crimson_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppProviders } from "@/providers/app-providers";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson-pro",
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
  themeColor: "#0a0c12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${crimsonPro.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
