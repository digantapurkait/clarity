import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MindMantra — A companion that remembers who you are becoming",
  description:
    "A daily emotional clarity companion that remembers your patterns, reflects your language, and helps you feel understood without judgment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0a0f] text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
