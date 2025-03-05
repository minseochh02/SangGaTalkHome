import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const geistSans = Geist({
	display: "swap",
	subsets: ["latin"],
});

export const metadata = {
	title: "SGT - Your Local Business Platform",
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
						<Navigation />
						<div className="flex flex-col w-full">{children}</div>
						<Footer />
					</div>
				</main>
			</body>
		</html>
	);
}
