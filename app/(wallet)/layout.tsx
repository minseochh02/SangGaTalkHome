import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "@/app/globals.css";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata = {
  title: "SGT Kiosk",
  description: "SangGaTalk Kiosk Interface",
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
      <body>
        <main className="min-h-screen bg-gray-100">
          <div className="flex flex-col w-full">{children}</div>
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  )
} 