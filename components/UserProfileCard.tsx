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
		<div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
			<div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4">
				<div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto sm:mx-0">
					<span className="text-xl sm:text-2xl font-bold text-blue-600">
						{username.charAt(0).toUpperCase()}
					</span>
				</div>
				<div className="text-center sm:text-left">
					<h2 className="text-lg sm:text-xl font-bold">{username}</h2>
					<p className="text-gray-600 text-sm sm:text-base">{email}</p>
				</div>
			</div>

			<div className="border-t pt-4 mt-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
					<div>
						<p className="text-xs sm:text-sm text-gray-500">Role</p>
						<p className="font-medium text-sm sm:text-base">{role}</p>
					</div>
					<div>
						<p className="text-xs sm:text-sm text-gray-500">Member Since</p>
						<p className="font-medium text-sm sm:text-base">{formattedDate}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
