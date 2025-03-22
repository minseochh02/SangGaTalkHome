import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

import type { Database } from '@/types.gen'

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    // Force Next.js to read cookies before Supabase tries to exchange the code
    // This is the key fix from the GitHub discussion
    await cookies(); // Access cookies to initialize them
    
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // This line is crucial according to the GitHub discussion
    // It ensures the cookies are properly read before exchanging the code
    await cookies();
    
    const response = await supabase.auth.exchangeCodeForSession(code)
    
    // Force Next.js to read cookies after the exchange as well
    await cookies();
    
    if (response.error) {
      console.error('Error logging in:', response.error.message)
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/profile`);
}
