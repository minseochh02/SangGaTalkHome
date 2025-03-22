"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
	const router = useRouter();
	const supabase = createClient();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [debugInfo, setDebugInfo] = useState<{ [key: string]: string }>({});

	useEffect(() => {
		// Get error message from URL if any
		if (typeof window !== "undefined") {
			const params = new URLSearchParams(window.location.search);
			const errorMsg = params.get("error");
			const codePresent = params.get("code_present");
			const verifierPresent = params.get("verifier_present");

			if (errorMsg) {
				setError(errorMsg);
			}

			if (codePresent || verifierPresent) {
				setDebugInfo({
					codePresent: codePresent || "unknown",
					verifierPresent: verifierPresent || "unknown",
				});
			}
		}

		// Check if user is already logged in
		const checkAuth = async () => {
			try {
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				if (!error && user) {
					router.push("/profile");
				}
			} catch (error) {
				console.error("Auth error:", error);
			} finally {
				setIsLoading(false);
			}
		};

		checkAuth();
	}, [router, supabase]);

	const handleGoogleSignIn = async () => {
		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}/auth/callback`,
					queryParams: {
						prompt: "consent", // Force consent to ensure fresh auth
						access_type: "offline", // Request refresh tokens
					},
				},
			});

			if (error) {
				throw error;
			}

			// Handle redirect - the SDK does this automatically,
			// but we can log it for debugging
			if (data?.url) {
				console.log("Redirecting to OAuth provider...");
			}
		} catch (error) {
			console.error("Error signing in with Google:", error);
		}
	};

	// Helper to clear all supabase-related cookies for debugging
	const clearAuthCookies = () => {
		if (typeof document === "undefined") return;

		const cookies = document.cookie.split(";");
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i];
			const [name] = cookie.trim().split("=");

			// Clear any Supabase-related cookies
			if (name.includes("sb-") || name.includes("supabase")) {
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
				console.log(`Cleared cookie: ${name}`);
			}
		}

		// Reload to ensure clean state
		window.location.reload();
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">Loading...</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-md p-8 space-y-4 rounded-lg shadow-lg bg-card">
				<h2 className="text-2xl font-bold text-center">로그인</h2>

				{error && (
					<div className="p-3 bg-red-100 text-red-800 rounded-md text-sm">
						<p className="font-semibold">로그인 오류:</p>
						<p>{error}</p>
						{Object.keys(debugInfo).length > 0 && (
							<div className="mt-2 text-xs">
								<p>디버그 정보:</p>
								<ul className="list-disc pl-4">
									<li>코드 존재: {debugInfo.codePresent}</li>
									<li>코드 검증자 존재: {debugInfo.verifierPresent}</li>
								</ul>
								<button
									onClick={clearAuthCookies}
									className="mt-2 text-blue-600 underline"
								>
									인증 쿠키 초기화 (디버깅용)
								</button>
							</div>
						)}
					</div>
				)}

				<div className="space-y-4">
					<Button
						onClick={handleGoogleSignIn}
						className="w-full flex items-center justify-center gap-2"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							width="24"
							height="24"
							className="mr-2"
						>
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
							<path fill="none" d="M1 1h22v22H1z" />
						</svg>
						구글 로그인
					</Button>
				</div>
			</div>
		</div>
	);
}
