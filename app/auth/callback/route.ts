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
  
  // Create a response object to set cookies on
  const response = NextResponse.redirect(new URL("/profile", request.url));
  
  const cookieStore = cookies();
  
  // Log all cookies for debugging
  console.log("Available cookies:", cookieStore.getAll().map(c => c.name));
  
  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name);
            console.log(`Getting cookie ${name}:`, cookie?.value ? "exists" : "not found");
            return cookie?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log(`Setting cookie ${name}`);
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            console.log(`Removing cookie ${name}`);
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
    console.log("Exchanging code for session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth error in callback:", error.message, error);
      console.log("code", code);
      return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), request.url));
    }
    
    console.log("Session exchange successful");
    // Successfully authenticated, return the response with cookies set
    return response;
  } catch (err) {
    console.error("Exception in auth callback:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}