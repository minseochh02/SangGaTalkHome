import { Geist } from "next/font/google";
import { Toaster } from "sonner";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata = {
  title: "SGT 지갑 스캔",
  description: "SGT 카드를 스캔하여 잔액을 확인하세요",
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={geistSans.className} suppressHydrationWarning>
      <body>
        <main className="min-h-screen flex flex-col items-center bg-black">
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="flex flex-col w-full">{children}</div>
          </div>
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
} 