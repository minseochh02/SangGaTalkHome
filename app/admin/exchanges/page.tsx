"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminExchangesList from "@/components/AdminExchangesList";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/utils/type";
import { ToastContainer } from "@/components/ui/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminExchangesPage() {
	const supabase = createClient();
	const router = useRouter();

	const [user, setUser] = useState<any>(null);
	const [userProfile, setUserProfile] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [redirecting, setRedirecting] = useState(false);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				// Check if user is authenticated
				const {
					data: { user: authUser },
					error: authError,
				} = await supabase.auth.getUser();

				if (authError || !authUser) {
					console.log("No authenticated user found");
					router.push("/login");
					setRedirecting(true);
					return;
				}

				setUser(authUser);

				// Fetch user profile data
				const { data: profileData, error: profileError } = await supabase
					.from("users")
					.select("*")
					.eq("email", authUser.email)
					.single();

				if (profileError || !profileData) {
					console.log(
						"No profile found for user, redirecting to account settings"
					);
					router.push("/account-setting");
					setRedirecting(true);
					return;
				}

				// Check if user is admin
				if (profileData.role !== "admin") {
					console.log("User is not an admin, redirecting to home");
					router.push("/");
					setRedirecting(true);
					return;
				}

				setUserProfile(profileData);
			} catch (error) {
				console.error("Error fetching user data:", error);
				router.push("/login");
				setRedirecting(true);
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, [router, supabase]);

	// Show loading state
	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-xl font-semibold">Loading...</p>
					<p className="text-sm text-gray-500 mt-2">
						Checking authentication...
					</p>
				</div>
			</div>
		);
	}

	// Show redirecting state
	if (redirecting || !user || !userProfile) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-xl font-semibold">Redirecting...</p>
					<p className="text-sm text-gray-500 mt-2">
						{!user ? "To login page" : "To account settings"}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-background">
			<div className="flex-1 flex flex-col">
				<div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
					<div className="max-w-6xl mx-auto">
						<main className="space-y-6 sm:space-y-8">
							<div className="flex justify-between items-center">
								<h1 className="text-2xl sm:text-3xl font-bold">환전 내역 관리</h1>
								<Button asChild variant="outline">
									<Link href="/profile">프로필로 돌아가기</Link>
								</Button>
							</div>

							<div className="bg-white rounded-lg shadow-md p-3 sm:p-6 overflow-x-auto">
								<AdminExchangesList />
							</div>
						</main>
					</div>
				</div>
			</div>
			<ToastContainer />
		</div>
	);
} 