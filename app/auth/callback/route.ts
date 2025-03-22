import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  const pkceState = requestUrl.searchParams.get("pkce_state");

  // Log the code to verify it's present
  console.log("Auth code received:", code ? "Present" : "Missing");
  console.log("PKCE state present:", pkceState ? "Yes" : "No");
  
  if (code) {
    const supabase = await createClient();
    
    // Debug cookies to see if code verifier is stored
    const cookieHeader = request.headers.get("cookie") || "";
    console.log("Cookie header:", cookieHeader);
    
    // Check for the code verifier cookie (sb-SOMETHING-auth-token-code-verifier)
    let codeVerifierCookie = cookieHeader
      .split(';')
      .find(cookie => cookie.trim().match(/sb-.*-auth-token-code-verifier/));
    
    // Also check for our backup cookie
    const backupVerifierCookie = cookieHeader
      .split(';')
      .find(cookie => cookie.trim().startsWith('sb-pkce-verifier='));
    
    // If we have a backup but not the original, use the backup
    if (!codeVerifierCookie && backupVerifierCookie) {
      codeVerifierCookie = backupVerifierCookie;
      console.log("Using backup code verifier cookie");
    }
    
    console.log("Code verifier cookie:", codeVerifierCookie ? "Present" : "Missing");
    
    // If we have code but no verifier, and we're not in the recovery flow, 
    // return a page that will try to recover from localStorage
    if (!codeVerifierCookie && pkceState && !requestUrl.searchParams.get("recovery")) {
      console.log("No code verifier found, attempting recovery from localStorage");
      
      // Return a page that will attempt to recover code verifier from localStorage
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head><title>Recovering Authentication</title></head>
          <body>
            <p>Recovering authentication state...</p>
            <script>
              // Try to get code verifier from localStorage
              try {
                const pkceState = "${pkceState}";
                const storedVerifier = localStorage.getItem('supabase_pkce_verifier_' + pkceState);
                
                if (storedVerifier) {
                  // Set it as a cookie and reload with recovery flag
                  document.cookie = "sb-pkce-verifier=" + storedVerifier + "; path=/; max-age=3600; SameSite=Lax";
                  console.log("Recovered code verifier from localStorage");
                  
                  // Redirect back with recovery flag to prevent loops
                  const url = new URL(window.location.href);
                  url.searchParams.set('recovery', 'true');
                  window.location.href = url.toString();
                } else {
                  console.error("No stored code verifier found");
                  window.location.href = "${origin}/login?error=No+stored+code+verifier+found";
                }
              } catch (e) {
                console.error("Error recovering code verifier:", e);
                window.location.href = "${origin}/login?error=" + encodeURIComponent("Error recovering code verifier: " + e.message);
              }
            </script>
          </body>
        </html>`,
        {
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Error exchanging code for session:", error.message);
      console.error("Full error:", JSON.stringify(error, null, 2));
      
      // Redirect to login page with error for debugging
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}&code_present=${!!code}&verifier_present=${!!codeVerifierCookie}`);
    }
    
    console.log("Authentication successful, user:", data.user?.id);
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/profile`);
}
