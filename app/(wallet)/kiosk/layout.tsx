import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import Script from "next/script";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata = {
  title: "SGT Wallet",
  description: "SGT Wallet Interface",
  // This is what breaks the parent layout inheritance
  layoutSegments: {
    parents: false
  }
};
// This makes the layout not inherit from parent layouts
export const dynamic = 'force-dynamic';

export default function KioskRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <head>
        <Script src="https://cdn.iamport.kr/v1/iamport.js" strategy="beforeInteractive" />
      </head>
      <body>
        <main className="min-h-screen bg-gray-100">
          <div className="flex flex-col w-full">{children}</div>
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  )
} 