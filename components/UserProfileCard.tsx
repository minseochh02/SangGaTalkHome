import React from "react";

interface UserProfileCardProps {
	username: string;
	email: string;
	role: string;
	createdAt: string;
}

export default function UserProfileCard({
	username,
	email,
	role,
	createdAt,
}: UserProfileCardProps) {
	// Format the date
	const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			<div className="flex items-center space-x-4 mb-4">
				<div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
					<span className="text-2xl font-bold text-blue-600">
						{username.charAt(0).toUpperCase()}
					</span>
				</div>
				<div>
					<h2 className="text-xl font-bold">{username}</h2>
					<p className="text-gray-600">{email}</p>
				</div>
			</div>

			<div className="border-t pt-4 mt-4">
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="text-sm text-gray-500">Role</p>
						<p className="font-medium">{role}</p>
					</div>
					<div>
						<p className="text-sm text-gray-500">Member Since</p>
						<p className="font-medium">{formattedDate}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
