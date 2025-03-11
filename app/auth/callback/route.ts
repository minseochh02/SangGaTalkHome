/* eslint-disable */
// @ts-nocheck
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
    const response = NextResponse.redirect(new URL('/profile', requestUrl), {
      status: 302,
    });

    // Force cookies to be read before creating the Supabase client
    cookies().getAll();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
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
      // Force cookies to be read again before exchanging code for session
      cookies().getAll();
      
      const response  = await supabase.auth.exchangeCodeForSession(code)
    cookies().getAll()
    // RangeError [ERR_HTTP_INVALID_STATUS_CODE]: Invalid status code: 0
    
    if (response.error) {
      console.error('Error logging in:', response.error.message)
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }
  }

    //   // If this is email confirmation, show a success message
    //   if (type === 'email_confirmation') {
    //     return NextResponse.redirect(new URL('/profile?verified=true', requestUrl), {
    //       status: 302,
    //     });
    //   }

    //   return response;
    catch (error) {
      console.error('Session error:', error);
      return NextResponse.redirect(new URL('/auth-error', requestUrl), {
        status: 302,
      });
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/profile', requestUrl), {
    status: 302,
  });
} 