import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s · KENUXA CORE",
    default:  "KENUXA CORE — Africa's Intelligence Operating System",
  },
  description:
    "The central nervous system powering the KENUXA ecosystem. Authentication, AI orchestration, memory, event bus, knowledge graph, and integration infrastructure.",
  keywords: ["KENUXA", "AI", "Africa", "Intelligence", "Platform", "Infrastructure"],
  authors: [{ name: "KENUXA" }],
  creator: "KENUXA",
};

export const viewport: Viewport = {
  themeColor: "#07080f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
