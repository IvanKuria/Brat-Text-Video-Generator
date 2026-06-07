import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "brat video generator",
  description: "audio → brat-style karaoke video, in your browser",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
