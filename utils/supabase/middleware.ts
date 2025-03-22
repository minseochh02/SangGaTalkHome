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
      
      // Special handling - attempt to recover the code verifier from URL if it's passed
      const url = new URL(request.url);
      const pkceState = url.searchParams.get('pkce_state');
      if (pkceState) {
        console.log('Found PKCE state in URL, will attempt recovery');
        
        // Add script to recover code verifier (will be injected via response)
        response = new NextResponse(
          `
          <!DOCTYPE html>
          <html>
            <head><title>Authentication</title></head>
            <body>
              <script>
                // Use stored code verifier from localStorage if available
                try {
                  const pkceState = "${pkceState}";
                  const storedVerifier = localStorage.getItem('supabase_pkce_verifier_' + pkceState);
                  
                  if (storedVerifier) {
                    document.cookie = "sb-pkce-verifier=" + storedVerifier + "; path=/; max-age=3600; SameSite=Lax";
                    console.log("Recovered code verifier from localStorage");
                  }
                  
                  // Redirect to the callback with the same parameters
                  window.location.href = window.location.href;
                } catch (e) {
                  console.error("Error recovering PKCE state:", e);
                  // Continue with the callback anyway
                  window.location.href = window.location.href;
                }
              </script>
              <p>Finalizing authentication...</p>
            </body>
          </html>
          `, 
          { headers: response.headers }
        );
        return response;
      }
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
