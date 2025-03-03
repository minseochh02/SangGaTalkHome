import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
	display: "swap",
	subsets: ["latin"],
});

export const metadata = {
	title: "SanggaTalk - Your Local Business Platform",
	description: "Connect with local businesses and earn SGT tokens",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={geistSans.className} suppressHydrationWarning>
			<body>
				<main className="min-h-screen flex flex-col items-center">
					<div className="flex-1 w-full flex flex-col items-center">
						<nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
							<div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
								<div className="flex gap-8 items-center">
									<Link href="/" className="font-bold text-lg">
										SangGaTalk
									</Link>
									<div className="flex items-center gap-6">
										<Link
											href="/stores/categories"
											className="hover:text-primary"
										>
											카테고리별 매장
										</Link>
										<Link
											href="/stores/locations"
											className="hover:text-primary"
										>
											지역별 매장
										</Link>
										<Link href="/sgt/products" className="hover:text-primary">
											상가톡 상품
										</Link>
										<Link
											href="/stores/register"
											className="hover:text-primary"
										>
											입점 신청
										</Link>
										<Link href="/sgt" className="hover:text-primary">
											SGT 이용
										</Link>
										<Link href="/support" className="hover:text-primary">
											고객센터
										</Link>
									</div>
								</div>
								<div className="flex items-center gap-4">
									<Link href="/search" className="hover:text-primary">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<circle cx="11" cy="11" r="8" />
											<line x1="21" y1="21" x2="16.65" y2="16.65" />
										</svg>
									</Link>
									<Link href="/login" className="hover:text-primary">
										로그인
									</Link>
									<Link
										href="/signup"
										className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
									>
										회원가입
									</Link>
								</div>
							</div>
						</nav>
						<div className="flex flex-col w-full">{children}</div>
						<footer className="w-full flex items-center justify-center border-t border-t-foreground/10 py-16">
							<div className="max-w-7xl w-full flex justify-between items-center px-5 text-sm">
								<p>© 2024 SanggaWallet. All rights reserved.</p>
								<div className="flex gap-4">
									<Link href="/privacy" className="hover:text-primary">
										Privacy Policy
									</Link>
									<Link href="/terms" className="hover:text-primary">
										Terms of Service
									</Link>
								</div>
							</div>
						</footer>
					</div>
				</main>
			</body>
		</html>
	);
}
