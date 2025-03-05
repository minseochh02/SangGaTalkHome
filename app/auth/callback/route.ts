// handle googlesignin callback
// 1, exchange the code for a session
// 2, redirect to the profile page

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  // If there's no code, something went wrong with the OAuth flow
  if (!code) {
    console.error("No code provided in callback");
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  const supabase = await createClient();
  
  // Exchange the code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    console.error("Auth error in callback:", error.message);
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // Successfully authenticated, redirect to profile page
  return NextResponse.redirect(new URL("/profile", request.url));
}