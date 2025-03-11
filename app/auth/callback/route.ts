/* eslint-disable */
// @ts-nocheck
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  // Debug: Log the URL and code
  console.log('Callback URL:', request.url);
  console.log('Auth code present:', !!code);
  
  if (!code) {
    return NextResponse.redirect(
      new URL('/auth-error?error=No authentication code provided', requestUrl),
      { status: 302 }
    );
  }
  
  // Create a response object that we'll modify with cookies
  const response = NextResponse.redirect(new URL('/profile', requestUrl), {
    status: 302,
  });
  
  // Create the Supabase client with the cookies API
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          const cookieStore = cookies();
          const cookie = cookieStore.get(name);
          // Debug: Log cookie retrieval
          console.log(`Getting cookie ${name}:`, cookie?.value ? 'exists' : 'missing');
          return cookie?.value;
        },
        set(name, value, options) {
          // Debug: Log cookie setting
          console.log(`Setting cookie ${name}`);
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          // Debug: Log cookie removal
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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Session exchange error:', error);
      return NextResponse.redirect(
        new URL(`/auth-error?error=${encodeURIComponent(error.message)}`, requestUrl),
        { status: 302 }
      );
    }
    
    console.log('Session exchange successful');
    return response;
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.redirect(
      new URL(`/auth-error?error=${encodeURIComponent(error.message || 'Failed to exchange code for session')}`, requestUrl),
      { status: 302 }
    );
  }
} 