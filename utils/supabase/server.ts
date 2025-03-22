import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  // Record all cookie names for debugging
  const allCookies = cookieStore.getAll();
  const cookieNames = allCookies.map(c => c.name);
  const hasPKCECookies = allCookies.some(cookie => 
    cookie.name.includes('code-verifier') || 
    cookie.name.includes('pkce-verifier')
  );
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Cookies available:', cookieNames.length);
    console.log('[Server] PKCE cookies present:', hasPKCECookies);
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Log critical PKCE cookies for debugging
              if (name.includes('code-verifier') && process.env.NODE_ENV !== 'production') {
                console.log(`[Server] Setting PKCE cookie: ${name}`);
              }
              
              // Enhance cookie security for PKCE
              const enhancedOptions = name.includes('code-verifier') 
                ? { 
                    ...options, 
                    secure: true, 
                    httpOnly: true,
                    sameSite: 'lax' as const,
                    maxAge: 60 * 60 // 1 hour
                  } 
                : options;
                
              cookieStore.set(name, value, enhancedOptions);
            });
          } catch (error) {
            console.error('[Server] Error setting cookies:', error);
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      auth: {
        // Explicitly enable PKCE for better security and mobile app compatibility
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    },
  );
};
