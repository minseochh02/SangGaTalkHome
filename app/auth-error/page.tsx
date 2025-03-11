import { Suspense } from "react";
import { AuthErrorContent } from "./AuthErrorContent";

export default function AuthError() {
	return (
		<Suspense fallback={<div className="p-4">Loading...</div>}>
			<AuthErrorContent />
		</Suspense>
	);
}
