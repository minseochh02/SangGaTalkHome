import Hero from "@/components/hero";
import Features from "@/components/Features";
import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col">
			<Hero />
			<Features />
			
			<div className="fixed bottom-5 right-5 z-10">
				<Link 
					href="/wallet" 
					className="flex items-center justify-center w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full shadow-lg transition-colors"
					aria-label="지갑 스캔"
				>
					<svg 
						xmlns="http://www.w3.org/2000/svg" 
						viewBox="0 0 24 24" 
						fill="none" 
						stroke="currentColor" 
						strokeWidth="2" 
						strokeLinecap="round" 
						strokeLinejoin="round" 
						className="w-6 h-6 text-white"
					>
						<rect width="20" height="14" x="2" y="5" rx="2" />
						<line x1="2" x2="22" y1="10" y2="10" />
					</svg>
				</Link>
			</div>
		</div>
	);
}
