"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ProfileForm from "./ProfileForm";

export default function AccountSettingPage() {
	const { user, userProfile, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// If not authenticated, redirect to login
		if (!isLoading && !user) {
			router.push("/login");
		}
	}, [user, isLoading, router]);

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
