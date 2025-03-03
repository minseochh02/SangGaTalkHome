import Link from "next/link";

export default function Footer() {
	return (
		<footer className="w-full flex items-center justify-center border-t border-t-foreground/10 py-16">
			<div className="max-w-7xl w-full flex flex-col md:flex-row justify-between items-center px-5 text-sm gap-4">
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
	);
}
