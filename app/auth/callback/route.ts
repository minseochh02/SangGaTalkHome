/* eslint-disable */
// @ts-nocheck
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  // If there's no code, something went wrong with the OAuth flow
  if (!code) {
    console.error("No code provided in callback");
    console.log(request.url);
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Create the response object that will be returned after successful authentication
  const response = NextResponse.redirect(new URL('/profile', requestUrl), {
    status: 302,
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookies on the response object
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
  
  try {
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth error in callback:", error.message);
      // Instead of redirecting to home, let's try again with a refresh
      if (error.message.includes("expired") || error.message.includes("invalid")) {
        console.log("Auth token expired or invalid, redirecting to login");
        return NextResponse.redirect(new URL("/login", request.url));
      }
      
      return NextResponse.redirect(new URL("/", request.url));
    }
    
    // Verify the session was established
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session) {
      console.log("Session not established after code exchange, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    console.log("Authentication successful, session established");
    
    // Add a small delay to ensure cookies are properly set
    // This can help with race conditions in serverless environments like Vercel
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Successfully authenticated, return the response with cookies set
    return response;
  } catch (e) {
    console.error("Unexpected error during authentication:", e);
    return NextResponse.redirect(new URL("/", request.url));
  }
}