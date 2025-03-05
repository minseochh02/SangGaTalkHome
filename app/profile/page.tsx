"use client";

// first check if user is logged in
// if not, redirect to login page
// if yes, try to retrieve user data from supabase users table
// if user data is not found, redirect to account setting page
// if user data is found, show profile page

import UserProfileCard from "@/components/UserProfileCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
export default function ProfilePage() {
	const { user, userProfile, isLoading } = useAuth();
	const router = useRouter();
	const [localLoading, setLocalLoading] = useState(true);
	const [redirecting, setRedirecting] = useState(false);

	console.log("ProfilePage render:", {
		isLoading,
		hasUser: !!user,
		hasProfile: !!userProfile,
		localLoading,
		redirecting,
	});

	useEffect(() => {
		console.log("ProfilePage useEffect triggered:", {
			isLoading,
			hasUser: !!user,
			hasProfile: !!userProfile,
		});

		// Set a timeout to prevent infinite loading
		const timeoutId = setTimeout(() => {
			if (localLoading) {
				console.log(
					"ProfilePage: Force ending local loading state after timeout"
				);
				setLocalLoading(false);
			}
		}, 5000); // 5 seconds timeout

		// Update local loading state based on auth context loading
		if (!isLoading) {
			console.log(
				"ProfilePage: Auth context loading completed, updating local loading state"
			);
			setLocalLoading(false);

			// Handle redirects only after loading is complete
			if (!user) {
				console.log("ProfilePage: Not authenticated, redirecting to login");
				setRedirecting(true);
				router.push("/login");
			} else if (!userProfile) {
				console.log(
					"ProfilePage: Authenticated but no profile, redirecting to account setting"
				);
				setRedirecting(true);
				router.push("/account-setting");
			}
		}

		return () => clearTimeout(timeoutId);
	}, [user, userProfile, isLoading, router, localLoading]);

	// Show loading state
	if (isLoading || localLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-xl font-semibold">Loading...</p>
					<p className="text-sm text-gray-500 mt-2">
						{isLoading ? "Checking authentication..." : "Preparing profile..."}
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

	// Show profile if everything is loaded and user has a profile
	return (
		<div className="flex min-h-screen bg-background">
			<div className="flex-1 flex flex-col">
				<div className="container mx-auto py-10">
					<div className="max-w-4xl mx-auto">
						<main className="space-y-6">
							<h1 className="text-3xl font-bold">프로필</h1>

							<UserProfileCard
								username={userProfile.username}
								email={user.email || ""}
								role={userProfile.role}
								createdAt={userProfile.created_at}
							/>

							<div className="mt-8 flex justify-end">
								<Button asChild>
									<Link href="/account-setting">Edit Profile</Link>
								</Button>
							</div>
						</main>
					</div>
				</div>
			</div>
		</div>
	);
}
