import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora" });

export const metadata: Metadata = {
  title: "Mobile Wallet Storage",
  description: "Save a membership card, loyalty card, or event ticket to Apple Wallet or Google Wallet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
