"use client";

import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useRef } from "react";

type UserProfile = {
	user_id: string;
	username: string;
	email: string;
	role: string;
	created_at: string;
};

type AuthContextType = {
	user: User | null;
	userProfile: UserProfile | null;
	isLoading: boolean;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
	refreshUserProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const initialFetchCompleted = useRef(false);
	const router = useRouter();
	const supabase = createClient();

	// Separate effect for initial fetch
	useEffect(() => {
		console.log("AuthContext: Starting initial fetch");

		const fetchUser = async () => {
			if (initialFetchCompleted.current) {
				console.log("AuthContext: Initial fetch already completed, skipping");
				return;
			}

			console.log("AuthContext: fetchUser started, setting isLoading = true");
			setIsLoading(true);

			try {
				// Get current user
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				console.log(
					"AuthContext: Auth user fetch result:",
					user ? "User found" : "No user",
					error ? `Error: ${error.message}` : "No error"
				);

				if (error || !user) {
					setUser(null);
					setUserProfile(null);
					console.log(
						"AuthContext: No user or error, setting isLoading = false"
					);
					setIsLoading(false);
					initialFetchCompleted.current = true;
					return;
				}

				setUser(user);

				// Get user profile from users table
				const { data: profileData, error: profileError } = await supabase
					.from("users")
					.select("*")
					.eq("user_id", user.id)
					.single();

				console.log(
					"AuthContext: Profile fetch result:",
					profileData ? "Profile found" : "No profile",
					profileError ? `Error: ${profileError.message}` : "No error"
				);

				if (profileError || !profileData) {
					setUserProfile(null);
				} else {
					setUserProfile(profileData as UserProfile);
				}
			} catch (error) {
				console.error("Error fetching user:", error);
			} finally {
				console.log(
					"AuthContext: fetchUser completed, setting isLoading = false"
				);
				setIsLoading(false);
				initialFetchCompleted.current = true;
			}
		};

		fetchUser();

		// Set a timeout to ensure loading state doesn't get stuck
		const timeoutId = setTimeout(() => {
			if (isLoading) {
				console.log("AuthContext: Force ending loading state after timeout");
				setIsLoading(false);
				initialFetchCompleted.current = true;
			}
		}, 3000); // 3 seconds timeout

		return () => clearTimeout(timeoutId);
	}, []);

	// Separate effect for auth state changes
	useEffect(() => {
		console.log("AuthContext: Setting up auth state listener");

		// Set up auth state listener
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("AuthContext: Auth state changed:", event);

			// Wait for initial fetch to complete before processing auth state changes
			if (!initialFetchCompleted.current) {
				console.log(
					"AuthContext: Initial fetch not completed yet, auth state change will be handled by initial fetch"
				);
				return;
			}

			// Set loading to true for auth state changes after initial fetch
			setIsLoading(true);

			try {
				if (session?.user) {
					console.log("AuthContext: Setting user from session");
					setUser(session.user);

					// Fetch user profile when auth state changes
					const { data: profileData, error } = await supabase
						.from("users")
						.select("*")
						.eq("user_id", session.user.id)
						.single();

					console.log(
						"AuthContext: Profile fetch on auth change:",
						profileData ? "Profile found" : "No profile",
						error ? `Error: ${error.message}` : "No error"
					);

					if (profileData) {
						setUserProfile(profileData as UserProfile);
					} else {
						setUserProfile(null);
					}
				} else {
					console.log(
						"AuthContext: No session user, clearing user and profile"
					);
					setUser(null);
					setUserProfile(null);
				}
			} catch (error) {
				console.error("Error handling auth state change:", error);
			} finally {
				// Ensure isLoading is set to false after auth state changes
				console.log(
					"AuthContext: Auth state change processing completed, setting isLoading = false"
				);
				setIsLoading(false);
			}
		});

		// Cleanup subscription
		return () => {
			console.log("AuthContext: Cleaning up auth state listener");
			subscription.unsubscribe();
		};
	}, []);

	// Add a useEffect to log state changes
	useEffect(() => {
		console.log("AuthContext state updated:", {
			isAuthenticated: !!user,
			hasProfile: !!userProfile,
			isLoading,
			initialFetchCompleted: initialFetchCompleted.current,
		});
	}, [user, userProfile, isLoading]);

	const signInWithGoogle = async () => {
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `${window.location.origin}/auth/callback`,
				},
			});

			if (error) throw error;
		} catch (error) {
			console.error("Error signing in with Google:", error);
			throw error;
		}
	};

	const signOut = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;

			setUser(null);
			setUserProfile(null);
			router.push("/");
		} catch (error) {
			console.error("Error signing out:", error);
			throw error;
		}
	};

	const refreshUserProfile = async () => {
		if (!user) return;

		try {
			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("user_id", user.id)
				.single();

			if (error) throw error;
			setUserProfile(data as UserProfile);
		} catch (error) {
			console.error("Error refreshing user profile:", error);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				userProfile,
				isLoading,
				signInWithGoogle,
				signOut,
				refreshUserProfile,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
