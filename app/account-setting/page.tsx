"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import ProfileForm from "./ProfileForm";

export default function AccountSettingPage() {
	const router = useRouter();
	const supabase = createClient();

	const [user, setUser] = useState<any>(null);
	const [userProfile, setUserProfile] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);

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
					return;
				}

				setUser(authUser);

				// Try to fetch user profile if it exists
				const { data: profileData } = await supabase
					.from("profiles")
					.select("*")
					.eq("email", authUser.email)
					.single();

				if (profileData) {
					setUserProfile(profileData);
				}
			} catch (error) {
				console.error("Error fetching user data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserData();
	}, [router, supabase]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">Loading...</div>
			</div>
		);
	}

	// Don't render anything if not authenticated
	if (!user) {
		return null;
	}

	// Prepare user data for the client component
	const userDataForClient = {
		user_id: user.id,
		email: user.email || "",
		username: userProfile?.username || "",
		role: userProfile?.role || "customer",
	};

	return (
		<div className="container mx-auto py-8 px-4">
			<h1 className="text-2xl font-bold mb-8 text-center">Profile Settings</h1>
			<ProfileForm userData={userDataForClient} />
		</div>
	);
}
