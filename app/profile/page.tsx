"use client";

// first check if user is logged in
// if not, redirect to login page
// if yes, try to retrieve user data from supabase users table
// if user data is not found, redirect to account setting page
// if user data is found, show profile page

import UserProfileCard from "@/components/UserProfileCard";
import StoreApplicationsList from "@/components/StoreApplicationsList";
import ApprovedStoresList from "@/components/ApprovedStoresList";
import UserFavoritesList from "@/components/UserFavoritesList";
import UserReviewsList from "@/components/UserReviewsList";
import AdminStoreApplicationsList from "@/components/AdminStoreApplicationsList";
import AdminApprovedStoresList from "@/components/AdminApprovedStoresList";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ToastContainer } from "@/components/ui/use-toast";
import { createClient } from "@/utils/supabase/client";

export default function ProfilePage() {
	const supabase = createClient();
	const router = useRouter();

	const [user, setUser] = useState<any>(null);
	const [userProfile, setUserProfile] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [localLoading, setLocalLoading] = useState(false);
	const [redirecting, setRedirecting] = useState(false);
	const [activeTab, setActiveTab] = useState<"applications" | "stores">(
		"applications"
	);
	const [activeFavoritesReviewsTab, setActiveFavoritesReviewsTab] = useState<
		"favorites" | "reviews"
	>("favorites");
	const [activeAdminTab, setActiveAdminTab] = useState<
		"applications" | "stores"
	>("applications");

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
					.from("profiles")
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

		// Add visibility change event listener to handle tab switching
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				console.log("Tab became visible again, refreshing auth state");
				// Force local loading to false regardless of auth context state
				// This ensures we don't get stuck in a loading state
				setLocalLoading(false);
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [localLoading]);

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

	// Check if user is admin
	const isAdmin = userProfile.role === "admin";

	// Show profile if everything is loaded and user has a profile
	return (
		<div className="flex min-h-screen bg-background">
			<div className="flex-1 flex flex-col">
				<div className="container mx-auto py-10">
					<div className="max-w-6xl mx-auto">
						<main className="space-y-8">
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

							{/* Admin Section - Only visible to admins */}
							{isAdmin && (
								<div className="mt-12">
									<h2 className="text-2xl font-bold mb-6">관리자 기능</h2>

									<div className="flex justify-between items-center mb-6">
										<div className="flex space-x-4">
											<button
												onClick={() => setActiveAdminTab("applications")}
												className={`px-4 py-2 rounded-lg ${
													activeAdminTab === "applications"
														? "bg-primary text-white"
														: "bg-gray-100 hover:bg-gray-200"
												}`}
											>
												매장 신청 관리
											</button>
											<button
												onClick={() => setActiveAdminTab("stores")}
												className={`px-4 py-2 rounded-lg ${
													activeAdminTab === "stores"
														? "bg-primary text-white"
														: "bg-gray-100 hover:bg-gray-200"
												}`}
											>
												등록된 매장 관리
											</button>
										</div>
									</div>

									<div className="bg-white rounded-lg shadow-md p-6">
										{activeAdminTab === "applications" ? (
											<div>
												<h3 className="text-lg font-semibold mb-4">
													매장 신청 관리
												</h3>
												<AdminStoreApplicationsList />
											</div>
										) : (
											<div>
												<h3 className="text-lg font-semibold mb-4">
													등록된 매장 관리
												</h3>
												<AdminApprovedStoresList />
											</div>
										)}
									</div>
								</div>
							)}

							{/* Favorites and Reviews Section */}
							<div className="mt-12">
								<h2 className="text-2xl font-bold mb-6">즐겨찾기 및 리뷰</h2>

								<div className="flex justify-between items-center mb-6">
									<div className="flex space-x-4">
										<button
											onClick={() => setActiveFavoritesReviewsTab("favorites")}
											className={`px-4 py-2 rounded-lg ${
												activeFavoritesReviewsTab === "favorites"
													? "bg-primary text-white"
													: "bg-gray-100 hover:bg-gray-200"
											}`}
										>
											즐겨찾기 매장
										</button>
										<button
											onClick={() => setActiveFavoritesReviewsTab("reviews")}
											className={`px-4 py-2 rounded-lg ${
												activeFavoritesReviewsTab === "reviews"
													? "bg-primary text-white"
													: "bg-gray-100 hover:bg-gray-200"
											}`}
										>
											내 리뷰
										</button>
									</div>
								</div>

								<div className="bg-white rounded-lg shadow-md p-6">
									{activeFavoritesReviewsTab === "favorites" ? (
										<div>
											<h3 className="text-lg font-semibold mb-4">
												즐겨찾기 매장
											</h3>
											<UserFavoritesList userId={user.id} />
										</div>
									) : (
										<div>
											<h3 className="text-lg font-semibold mb-4">내 리뷰</h3>
											<UserReviewsList userId={user.id} />
										</div>
									)}
								</div>
							</div>

							{/* SGT Stores Section */}
							<div className="mt-12">
								<h2 className="text-2xl font-bold mb-6">SGT 매장</h2>

								<div className="flex justify-between items-center mb-6">
									<div className="flex space-x-4">
										<button
											onClick={() => setActiveTab("applications")}
											className={`px-4 py-2 rounded-lg ${
												activeTab === "applications"
													? "bg-primary text-white"
													: "bg-gray-100 hover:bg-gray-200"
											}`}
										>
											매장 신청 현황
										</button>
										<button
											onClick={() => setActiveTab("stores")}
											className={`px-4 py-2 rounded-lg ${
												activeTab === "stores"
													? "bg-primary text-white"
													: "bg-gray-100 hover:bg-gray-200"
											}`}
										>
											승인된 매장
										</button>
									</div>
									<Button asChild>
										<Link href="/stores/register">새 매장 신청</Link>
									</Button>
								</div>

								<div className="bg-white rounded-lg shadow-md p-6">
									{activeTab === "applications" ? (
										<div>
											<h3 className="text-lg font-semibold mb-4">
												매장 신청 현황
											</h3>
											<StoreApplicationsList userId={user.id} />
										</div>
									) : (
										<div>
											<h3 className="text-lg font-semibold mb-4">
												승인된 매장
											</h3>
											<ApprovedStoresList userId={user.id} />
										</div>
									)}
								</div>
							</div>
						</main>
					</div>
				</div>
			</div>
			<ToastContainer />
			<div></div>
		</div>
	);
}
