"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface ProfileSettingProps {
	user: User;
}

export function ProfileSetting({ user }: ProfileSettingProps) {
	const router = useRouter();
	const [formData, setFormData] = useState({
		username: user.email?.split("@")[0] || "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		// Basic validation
		if (!formData.username.trim()) {
			setError("사용자 이름을 입력해주세요");
			setIsLoading(false);
			return;
		}

		try {
			const supabase = createClient();

			// Update the user's metadata
			const { error: updateError } = await supabase.auth.updateUser({
				data: {
					username: formData.username,
					has_completed_profile: true,
				},
			});

			if (updateError) {
				throw updateError;
			}

			// Insert user data into the users table
			const { error: insertError } = await supabase.from("users").insert([
				{
					user_id: user.id,
					username: formData.username,
					role: "customer", // Default role
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			]);

			if (insertError) {
				throw insertError;
			}

			// Redirect to the mypage
			router.push("/protected/mypage");
		} catch (error) {
			setError("가입을 완료할 수 없습니다. 다시 시도해주세요.");
			console.error("Error during signup:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
			<h1 className="text-2xl font-bold mb-6">프로필 설정</h1>
			<p className="text-gray-600 mb-6">
				계정 설정을 완료하기 위해 사용자 이름을 선택해주세요.
			</p>

			{user.email && (
				<div className="mb-4 p-3 bg-gray-50 rounded-md">
					<p className="text-sm text-gray-600">
						<span className="font-medium">이메일:</span> {user.email}
					</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="username">사용자 이름</Label>
					<Input
						id="username"
						name="username"
						placeholder="사용자 이름 입력"
						value={formData.username}
						onChange={handleChange}
						required
					/>
					<p className="text-xs text-gray-500">
						다른 사용자에게 표시될 이름입니다.
					</p>
				</div>

				{error && (
					<div className="p-2 rounded text-sm bg-red-100 text-red-800">
						{error}
					</div>
				)}

				<Button type="submit" disabled={isLoading} className="w-full">
					{isLoading ? "프로필 생성 중..." : "가입 완료"}
				</Button>
			</form>
		</div>
	);
}
