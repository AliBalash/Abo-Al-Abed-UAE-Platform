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
  title: "Farooj Abu Al-Abed Kitchen",
  description: "Kitchen and admin cockpit for Farooj Abu Al-Abed UAE pickup platform",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${arabic.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
