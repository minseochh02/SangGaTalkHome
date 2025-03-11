/* eslint-disable */
// @ts-nocheck
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  if (error) {
    console.error('Auth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth-error?error=${encodeURIComponent(error_description || error)}`, requestUrl),
      { status: 302 }
    );
  }

  if (code) {
    // Create a response object that we'll only use for cookie management
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({
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
          },
        },
      }
    );

    try {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) throw sessionError;

      // Only create the response AFTER successful authentication
      // If this is email confirmation, show a success message
      if (type === 'email_confirmation') {
        return NextResponse.redirect(new URL('/profile?verified=true', requestUrl), {
          status: 302,
        });
      }

      // Create and return the response AFTER authentication is successful
      return NextResponse.redirect(new URL('/profile', requestUrl), {
        status: 302,
      });
    } catch (error) {
      // console.error('Session error:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.redirect(new URL('/profile', requestUrl), {
        status: 302,
      });
    }
  }
  // wait a second here 
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/profile', requestUrl), {
    status: 302,
  });
} 