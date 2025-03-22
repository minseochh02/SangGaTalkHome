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

    // Debug cookie presence
    const cookies = request.cookies.getAll();
    const hasPKCECookies = cookies.some(cookie => 
      cookie.name.includes('code-verifier') || 
      cookie.name.includes('pkce-verifier')
    );
    
    // Log the state for debugging
    if (request.nextUrl.pathname === '/auth/callback') {
      console.log('Cookies in callback:', cookies.map(c => c.name));
      console.log('PKCE cookies present:', hasPKCECookies);
    }

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
            
            // Set cookies on response with special handling for secure properties
            cookiesToSet.forEach(({ name, value, options }) => {
              // Add more secure cookie options for certain cookies
              const finalOptions = name.includes('code-verifier') ? 
                {
                  ...options,
                  secure: true,
                  sameSite: 'lax' as const,
                  httpOnly: true,
                  maxAge: 60 * 60, // 1 hour
                } : options;
                
              response.cookies.set({
                name,
                value,
                ...finalOptions,
              });
              
              // Debug log for PKCE related cookies
              if (name.includes('code-verifier')) {
                console.log(`Setting code verifier cookie: ${name}`);
              }
            });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();

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
