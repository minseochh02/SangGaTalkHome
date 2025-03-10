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

  // Create a cookies container
  const cookieStore = cookies();
  
  // Create the response object that will be returned after successful authentication
  const response = NextResponse.redirect(new URL('/profile', requestUrl), {
    status: 302,
  });
  
  try {
    // Create the Supabase client with proper cookie handling
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
              // Ensure cookies are accessible across the site
              path: '/',
              // Use secure cookies in production
              secure: process.env.NODE_ENV === 'production',
              // Use strict same-site policy
              sameSite: 'lax',
            });
            
            response.cookies.set({
              name,
              value,
              ...options,
              // Ensure cookies are accessible across the site
              path: '/',
              // Use secure cookies in production
              secure: process.env.NODE_ENV === 'production',
              // Use strict same-site policy
              sameSite: 'lax',
            });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/',
            });
            
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/',
            });
          },
        },
      }
    );
    
    // Get the code verifier from the cookie
    // This is the critical part for PKCE flow
    const pkceVerifier = cookieStore.get('supabase-auth-pkce-verifier')?.value;
    
    if (!pkceVerifier) {
      console.error("PKCE verifier cookie is missing");
      // Instead of redirecting to login with an error, redirect to the login page
      // to start a fresh authentication flow
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    // Exchange the code for a session with the code verifier
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth error in callback:", error.message);
      
      // If the error is related to the code verifier, redirect to login to start fresh
      if (error.message.includes("code verifier")) {
        console.error("Code verifier issue detected, redirecting to login for fresh auth flow");
        return NextResponse.redirect(new URL("/login", request.url));
      }
      
      return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(error.message), request.url));
    }
    
    if (!data?.session) {
      console.error("No session data returned after code exchange");
      return NextResponse.redirect(new URL("/login?error=no_session", request.url));
    }
    
    // Ensure all auth cookies are properly set on the response
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token'
    ];
    
    for (const name of authCookies) {
      const cookie = cookieStore.get(name);
      if (cookie) {
        response.cookies.set({
          name,
          value: cookie.value,
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      }
    }
    
    // Clean up the PKCE verifier cookie as it's no longer needed
    response.cookies.set({
      name: 'supabase-auth-pkce-verifier',
      value: '',
      maxAge: 0,
      path: '/',
    });
    
    console.log("Authentication successful, redirecting to /profile");
    
    // Successfully authenticated, return the response with cookies set
    return response;
  } catch (e) {
    console.error("Unexpected error during authentication:", e);
    return NextResponse.redirect(new URL("/login?error=unexpected", request.url));
  }
}