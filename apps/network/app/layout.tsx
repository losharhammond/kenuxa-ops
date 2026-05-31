import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · KENUXA BUSINESS NETWORK",
    default: "KENUXA BUSINESS NETWORK — The Global SME Operating System",
  },
  description:
    "The digital headquarters for every business. Connect, trade, manage, and grow — Ghana's largest business network powered by AI.",
  keywords: ["KENUXA", "business", "Ghana", "SME", "directory", "marketplace", "POS", "ERP", "fintech"],
  authors: [{ name: "KENUXA" }],
  creator: "KENUXA",
  metadataBase: new URL("https://network.kenuxa.com"),
  openGraph: {
    type: "website",
    locale: "en_GH",
    title: "KENUXA BUSINESS NETWORK",
    description: "The Operating System for the Global SME Economy",
    siteName: "KENUXA Business Network",
  },
  twitter: {
    card: "summary_large_image",
    title: "KENUXA BUSINESS NETWORK",
    description: "The Operating System for the Global SME Economy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6524",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
