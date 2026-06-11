import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treasury Label Verification Prototype",
  description: "AI-assisted alcohol label verification proof of concept"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
