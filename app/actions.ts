"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cookies } from 'next/headers'


export const signInWithGoogleAction = async () => {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/", error.message);
  }

  redirect(data.url);
};

export const signOutAction = async () => {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("Error signing out:", error.message);
  }
  
  // Add a small delay to ensure cookies are cleared
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return redirect("/");
};

export const updateUserProfileAction = async (formData: FormData) => {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const userId = formData.get("user_id") as string;
  const username = formData.get("username") as string;
  const role = formData.get("role") as string;
  
  if (!userId || !username || !role) {
    return encodedRedirect(
      "error",
      "/account-setting",
      "All fields are required"
    );
  }
  
  // Check if user already exists in the users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  let result;
  
  if (existingUser) {
    // Update existing user
    result = await supabase
      .from("users")
      .update({
        username,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    // Create new user
    const { data: userData } = await supabase.auth.getUser();
    
    result = await supabase
      .from("users")
      .insert({
        user_id: userId,
        username,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: userData.user?.email,
      });
  }
  
  if (result.error) {
    console.error("Error updating user profile:", result.error.message);
    return encodedRedirect(
      "error",
      "/account-setting",
      result.error.message
    );
  }
  
  return encodedRedirect(
    "success",
    "/profile",
    "Profile updated successfully"
  );
};


// export const signUpAction = async (formData: FormData) => {
//   const email = formData.get("email")?.toString();
//   const password = formData.get("password")?.toString();
//   const supabase = await createClient();
//   const origin = (await headers()).get("origin");

//   if (!email || !password) {
//     return encodedRedirect(
//       "error",
//       "/sign-up",
//       "Email and password are required",
//     );
//   }

//   const { error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       emailRedirectTo: `${origin}/auth/callback`,
//     },
//   });

//   if (error) {
//     console.error(error.code + " " + error.message);
//     return encodedRedirect("error", "/sign-up", error.message);
//   } else {
//     return encodedRedirect(
//       "success",
//       "/sign-up",
//       "Thanks for signing up! Please check your email for a verification link.",
//     );
//   }
// };

// export const signInAction = async (formData: FormData) => {
//   const email = formData.get("email") as string;
//   const password = formData.get("password") as string;
//   const supabase = await createClient();

//   const { error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });

//   if (error) {
//     return encodedRedirect("error", "/sign-in", error.message);
//   }

//   return redirect("/mypage");
// };


// export const forgotPasswordAction = async (formData: FormData) => {
//   const email = formData.get("email")?.toString();
//   const supabase = await createClient();
//   const origin = (await headers()).get("origin");
//   const callbackUrl = formData.get("callbackUrl")?.toString();

//   if (!email) {
//     return encodedRedirect("error", "/forgot-password", "Email is required");
//   }

//   const { error } = await supabase.auth.resetPasswordForEmail(email, {
//     redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
//   });

//   if (error) {
//     console.error(error.message);
//     return encodedRedirect(
//       "error",
//       "/forgot-password",
//       "Could not reset password",
//     );
//   }

//   if (callbackUrl) {
//     return redirect(callbackUrl);
//   }

//   return encodedRedirect(
//     "success",
//     "/forgot-password",
//     "Check your email for a link to reset your password.",
//   );
// };

// export const resetPasswordAction = async (formData: FormData) => {
//   const supabase = await createClient();

//   const password = formData.get("password") as string;
//   const confirmPassword = formData.get("confirmPassword") as string;

//   if (!password || !confirmPassword) {
//     return encodedRedirect(
//       "error",
//       "/protected/reset-password",
//       "Password and confirm password are required",
//     );
//   }

//   if (password !== confirmPassword) {
//     return encodedRedirect(
//       "error",
//       "/protected/reset-password",
//       "Passwords do not match",
//     );
//   }

//   const { error } = await supabase.auth.updateUser({
//     password: password,
//   });

//   if (error) {
//     return encodedRedirect(
//       "error",
//       "/protected/reset-password",
//       "Password update failed",
//     );
//   }

//   return encodedRedirect("success", "/protected/reset-password", "Password updated");
// };


