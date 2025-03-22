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

  // Log the code to verify it's present
  console.log("Auth code received:", code ? "Present" : "Missing");
  
  if (code) {
    const supabase = await createClient();
    
    // Debug cookies to see if code verifier is stored
    const cookieHeader = request.headers.get("cookie") || "";
    console.log("Cookie header:", cookieHeader);
    
    // Check for the code verifier cookie (sb-SOMETHING-auth-token-code-verifier)
    const codeVerifierCookie = cookieHeader
      .split(';')
      .find(cookie => cookie.trim().match(/sb-.*-auth-token-code-verifier/));
    
    console.log("Code verifier cookie:", codeVerifierCookie ? "Present" : "Missing");
    
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
