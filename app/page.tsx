import Hero from "@/components/hero";
import Features from "@/components/Features";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col">
			<Hero />
			<Features />
		</div>
	);
}
