"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Navigation() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [user, setUser] = useState<any>(null);
	const [userProfile, setUserProfile] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();
	const supabase = createClient();

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				if (!error && user) {
					setUser(user);

					// Fetch user profile if needed
					const { data: profileData } = await supabase
						.from("users")
						.select("*")
						.eq("email", user.email)
						.single();

					if (profileData) {
						setUserProfile(profileData);
					}
				}
			} catch (error) {
				console.error("Error fetching user:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchUser();
	}, [supabase, router]);

	const signOut = async () => {
		try {
			await supabase.auth.signOut();
			setUser(null);
			setUserProfile(null);
			router.push("/");
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	return (
		<>
			<nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
				<div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
					<div className="flex gap-8 items-center">
						<Link href="/" className="font-bold text-lg">
							SGT
						</Link>
						<div className="hidden md:flex items-center gap-6">
							<Link href="/stores/categories" className="hover:text-primary">
								카테고리별 스토어
							</Link>
							<Link href="/stores/locations" className="hover:text-primary">
								지역별 스토어
							</Link>
							{/* <Link href="/sgt/products" className="hover:text-primary">
								SGT 상품
							</Link> */}
							<Link href="/stores/register" className="hover:text-primary">
								스토어 등록
							</Link>
							<Link href="/sgt" className="hover:text-primary">
								SGT 이용
							</Link>
							<Link href="/support" className="hover:text-primary">
								고객센터
							</Link>
						</div>
					</div>
					<div className="hidden md:flex items-center gap-4">
						<Link href="/search" className="hover:text-primary">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
						</Link>
						{!user ? (
							<>
								<Link href="/login" className="hover:text-primary">
									로그인
								</Link>
								<Link
									href="/signup"
									className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
								>
									회원가입
								</Link>
							</>
						) : (
							<>
								<Link href="/profile" className="hover:text-primary">
									{userProfile?.username || user.email || "프로필"}
								</Link>
								<button
									onClick={() => signOut()}
									className="hover:text-primary"
								>
									로그아웃
								</button>
							</>
						)}
					</div>

					{/* Mobile menu button */}
					<div className="md:hidden flex items-center">
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="p-2 rounded-md hover:bg-gray-100"
						>
							{mobileMenuOpen ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<line x1="3" y1="12" x2="21" y2="12"></line>
									<line x1="3" y1="6" x2="21" y2="6"></line>
									<line x1="3" y1="18" x2="21" y2="18"></line>
								</svg>
							)}
						</button>
					</div>
				</div>
			</nav>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<div
					className="md:hidden w-full bg-white border-b border-b-foreground/10 py-4 px-5"
					key={user?.id || "logged-out"}
				>
					<div className="flex flex-col space-y-4">
						<Link
							href="/stores/categories"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							카테고리별 스토어
						</Link>
						<Link
							href="/stores/locations"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							지역별 스토어
						</Link>
						{/* <Link
							href="/sgt/products"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							SGT 상품
						</Link> */}
						<Link
							href="/stores/register"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							스토어 등록
						</Link>
						<Link
							href="/sgt"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							SGT 이용
						</Link>
						<Link
							href="/support"
							className="hover:text-primary py-2"
							onClick={() => setMobileMenuOpen(false)}
						>
							고객센터
						</Link>
						<div
							className="flex items-center gap-4 pt-4 border-t"
							key={user?.id || "no-user"}
						>
							<Link
								href="/search"
								className="hover:text-primary"
								onClick={() => setMobileMenuOpen(false)}
							>
								검색
							</Link>
							{!user ? (
								<>
									<Link
										href="/login"
										className="hover:text-primary"
										onClick={() => setMobileMenuOpen(false)}
									>
										로그인
									</Link>
									<Link
										href="/signup"
										className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
										onClick={() => setMobileMenuOpen(false)}
									>
										회원가입
									</Link>
								</>
							) : (
								<>
									<Link
										href="/profile"
										className="hover:text-primary"
										onClick={() => setMobileMenuOpen(false)}
									>
										프로필
									</Link>
									<button
										onClick={() => {
											signOut();
											setMobileMenuOpen(false);
										}}
										className="hover:text-primary"
									>
										로그아웃
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
