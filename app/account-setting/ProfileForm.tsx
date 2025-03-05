"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type UserData = {
	user_id: string;
	email: string;
	username?: string;
	role?: string;
};

export default function ProfileForm({ userData }: { userData: UserData }) {
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const router = useRouter();
	const { refreshUserProfile } = useAuth();

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsLoading(true);
		setMessage(null);

		const formData = new FormData(event.currentTarget);
		const username = formData.get("username") as string;

		if (!username) {
			setMessage({ type: "error", text: "Username is required" });
			setIsLoading(false);
			return;
		}

		try {
			// Use server action to update profile
			const response = await fetch("/api/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					user_id: userData.user_id,
					username,
					role: userData.role,
					email: userData.email,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to update profile");
			}

			// Update the user profile in the auth context
			await refreshUserProfile();

			setMessage({ type: "success", text: "Profile updated successfully" });
			setTimeout(() => router.push("/profile"), 1500);
		} catch (error) {
			console.error("Error updating profile:", error);
			setMessage({
				type: "error",
				text:
					error instanceof Error ? error.message : "Failed to update profile",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			{message && (
				<div
					className={`p-4 mb-6 rounded-md ${
						message.type === "success"
							? "bg-green-100 text-green-800"
							: "bg-red-100 text-red-800"
					}`}
				>
					{message.text}
				</div>
			)}

			<form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
				<div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
					<div>
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							name="username"
							defaultValue={userData.username || ""}
							className="mt-1"
							required
						/>
					</div>

					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							defaultValue={userData.email || ""}
							className="mt-1"
							disabled
						/>
						<p className="text-sm text-gray-500 mt-1">
							Email cannot be changed
						</p>
					</div>

					<div>
						<Label htmlFor="role">Role</Label>
						<Input
							id="role"
							name="role"
							defaultValue={userData.role || "customer"}
							className="mt-1"
							disabled
						/>
						<p className="text-sm text-gray-500 mt-1">
							Your account role cannot be changed
						</p>
					</div>

					<div className="pt-4">
						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</div>
			</form>
		</>
	);
}
