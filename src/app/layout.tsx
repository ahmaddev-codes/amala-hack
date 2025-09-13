import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amala Discovery Platform - Find Authentic Amala Spots in Lagos",
  description:
    "Discover the best Amala restaurants and local spots across Lagos, Nigeria. User-submitted locations with real reviews and ratings.",
  icons: {
    icon: [
      {
        url: "/google-map-logo.jpg",
        sizes: "32x32",
        type: "image/jpeg",
      },
    ],
    shortcut: "/google-map-logo.jpg",
    apple: "/google-map-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
