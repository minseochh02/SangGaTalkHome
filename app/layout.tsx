import { GeistSans } from "geist/font/sans";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const geistSans = GeistSans;

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
				<AuthProvider>
					<main className="min-h-screen flex flex-col items-center">
						<div className="flex-1 w-full flex flex-col items-center">
							<Navigation />
							<div className="flex flex-col w-full">{children}</div>
							<Footer />
						</div>
					</main>
					<Toaster position="top-center" />
				</AuthProvider>
			</body>
		</html>
	);
}
