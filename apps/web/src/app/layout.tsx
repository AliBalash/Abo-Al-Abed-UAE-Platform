import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans_Arabic } from "next/font/google";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "Abo Al-Abed Ops",
  description: "Operations and admin cockpit for Abo Al-Abed UAE pickup platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${arabic.variable}`}>{children}</body>
    </html>
  );
}
