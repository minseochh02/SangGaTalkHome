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

  // IMPORTANT: Create a cookies container first
  const cookieStore = cookies();
  
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
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookies both on the response object AND in the cookie store
          cookieStore.set({
            name,
            value,
            ...options,
          });
          
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
          
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
      return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), request.url));
    }
    
    if (!data?.session) {
      console.error("No session data returned after code exchange");
      return NextResponse.redirect(new URL("/login?error=no_session", request.url));
    }
    
    // Explicitly set the session cookie to ensure it's available
    const sessionCookie = cookieStore.get('sb-auth-token');
    if (sessionCookie) {
      response.cookies.set({
        name: 'sb-auth-token',
        value: sessionCookie.value,
        ...sessionCookie.options,
      });
    }
    
    // Get all Supabase-related cookies and ensure they're on the response
    for (const name of ['sb-access-token', 'sb-refresh-token']) {
      const cookie = cookieStore.get(name);
      if (cookie) {
        response.cookies.set({
          name,
          value: cookie.value,
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
        });
      }
    }
    
    console.log("Authentication successful, redirecting to /profile");
    
    // Successfully authenticated, return the response with cookies set
    return response;
  } catch (e) {
    console.error("Unexpected error during authentication:", e);
    return NextResponse.redirect(new URL("/login?error=unexpected", request.url));
  }
}