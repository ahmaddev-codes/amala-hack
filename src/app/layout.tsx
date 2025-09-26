import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/FirebaseAuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ToastContainer } from "@/components/toast/ToastContainer";
import { NetworkStatusBanner } from "@/components/ui/network-status";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "Amala Discovery Platform - Find Authentic Amala Restaurants Worldwide",
  description:
    "Discover authentic Amala restaurants worldwide with AI-powered location discovery, community reviews, and real-time moderation. Join the global Amala community.",
  keywords: [
    "amala",
    "nigerian food",
    "restaurants",
    "food discovery",
    "african cuisine",
    "yam flour",
  ],
  authors: [{ name: "Amala Discovery Team" }],
  creator: "Amala Discovery Platform",
  publisher: "Amala Discovery Platform",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://amala-discovery.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Amala Discovery Platform",
    description:
      "Discover authentic Amala restaurants worldwide with AI-powered location discovery",
    url: "https://amala-discovery.vercel.app",
    siteName: "Amala Discovery Platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Amala Discovery Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Amala Discovery Platform",
    description: "Discover authentic Amala restaurants worldwide",
    images: ["/google-maps-logo.png"],
  },
  icons: {
    icon: [
      { url: "/google-maps-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/google-maps-logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/google-maps-logo.png",
    apple: [
      { url: "/google-maps-logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Amala Discovery",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#16a34a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Amala Discovery" />
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <NetworkStatusBanner />
            {children}
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>

        {/* Service Worker Registration & Error Handling */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global error handlers
              window.addEventListener('unhandledrejection', function(event) {
                console.error('Unhandled promise rejection:', event.reason);
                event.preventDefault();
              });

              window.addEventListener('error', function(event) {
                console.error('Global error:', event.error);
              });

              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
