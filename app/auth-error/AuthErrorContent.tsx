"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function AuthErrorContent() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
						Authentication Error
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600">
						{error || "There was a problem authenticating your account."}
					</p>
				</div>
				<div className="mt-8 space-y-6">
					<div className="text-sm text-center">
						<Link
							href="/"
							className="font-medium text-blue-600 hover:text-blue-500"
						>
							Return to Home
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
