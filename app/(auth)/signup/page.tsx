"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function SignupPage() {
	const router = useRouter();
	const supabase = createClient();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
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

	const handleGoogleSignUp = async () => {
		try {
			// Add hook for PKCE code verifier storage
			// Monkey patch the internal auth functions to capture and store PKCE data
			const originalStorageFunctions = Object.getOwnPropertyDescriptor(
				Storage.prototype,
				"setItem"
			);
			let pkceState = "";

			// Intercept localStorage setItem to detect and backup code verifier
			if (originalStorageFunctions) {
				Object.defineProperty(Storage.prototype, "setItem", {
					configurable: true,
					enumerable: true,
					writable: true,
					value: function (key: string, value: string) {
						// When the Supabase SDK stores a code verifier, also back it up
						if (key.includes("code-verifier")) {
							console.log("Intercepted code verifier storage", key);

							// Extract state from key if present
							const stateMatch = key.match(/pkce-(\w+)/);
							if (stateMatch && stateMatch[1]) {
								pkceState = stateMatch[1];
								// Store with a standardized key format
								localStorage.setItem(
									"supabase_pkce_verifier_" + pkceState,
									value
								);
							}
						}
						// Call original function
						originalStorageFunctions.value.call(this, key, value);
					},
				});
			}

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

			// Restore original storage function
			if (originalStorageFunctions) {
				Object.defineProperty(
					Storage.prototype,
					"setItem",
					originalStorageFunctions
				);
			}

			if (error) {
				throw error;
			}

			// Append PKCE state to the URL if available
			if (data?.url && pkceState) {
				const url = new URL(data.url);
				url.searchParams.append("pkce_state", pkceState);
				console.log("Redirecting to OAuth provider with PKCE state...");
				window.location.href = url.toString();
				return;
			}

			// Standard redirect
			if (data?.url) {
				console.log("Redirecting to OAuth provider...");
			}
		} catch (error) {
			console.error("Error signing up with Google:", error);
		}
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
				<h2 className="text-2xl font-bold text-center">회원가입</h2>
				<p className="text-center text-muted-foreground">
					SangGaWallet에 오신 것을 환영합니다. 계정을 만들어 시작하세요.
				</p>
				<div className="space-y-4">
					<Button
						onClick={handleGoogleSignUp}
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
						구글로 회원가입
					</Button>
				</div>
				<div className="text-center text-sm">
					<p className="text-muted-foreground">
						이미 계정이 있으신가요?{" "}
						<Link href="/login" className="text-primary hover:underline">
							로그인
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
