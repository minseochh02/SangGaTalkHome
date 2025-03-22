import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Set cookies on request for middleware
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            
            // Create a new response to preserve the updated cookies
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            
            // Set cookies on response with full options
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({
                name,
                value,
                ...options,
              });
            });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    await supabase.auth.getUser();

    // // protected routes
    // if (request.nextUrl.pathname.startsWith("/protected") && user.error) {
    //   return NextResponse.redirect(new URL("/sign-in", request.url));
    // }

    // if (request.nextUrl.pathname === "/" && !user.error) {
    //   return NextResponse.redirect(new URL("/protected", request.url));
    // }

    return response;
  } catch (e) {
    console.error("Supabase middleware error:", e);
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
