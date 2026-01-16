import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SWRProvider } from "@/components/providers/swr-provider";

export const metadata: Metadata = {
  title: "MAAC Attendance Portal",
  description: "Student Attendance Management System for MAAC Centers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <SWRProvider>
          {children}
        </SWRProvider>
        <Toaster />
      </body>
    </html>
  );
}

