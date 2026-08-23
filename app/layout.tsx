import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Game Management - نظام إدارة محلات الألعاب",
  description: "نظام إدارة يومي لمحل بلايستيشن — أجهزة، بلياردو، ومشروبات",
  icons: {
    icon: "/logo-ps.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-page text-foreground">
        {children}
      </body>
    </html>
  );
}
