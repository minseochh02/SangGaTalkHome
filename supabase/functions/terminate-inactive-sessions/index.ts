import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Ensure Deno types are available if not globally configured
// deno-lint-ignore-file no-explicit-any

const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const INACTIVITY_PERIOD_HOURS = 4;

serve(async (req: Request) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[terminate-inactive-sessions] Missing Supabase URL or Service Role Key env vars.");
    return new Response(
      JSON.stringify({ error: "Missing Supabase URL or Service Role Key environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const currentTime = new Date();
    const fourHoursAgo = new Date(currentTime.getTime() - INACTIVITY_PERIOD_HOURS * 60 * 60 * 1000);

    console.log(`[terminate-inactive-sessions] Running at: ${currentTime.toISOString()}`);
    console.log(`[terminate-inactive-sessions] Looking for sessions last active before: ${fourHoursAgo.toISOString()}`);

    const { data: inactiveSessions, error: selectError } = await supabaseAdmin
      .from("kiosk_sessions")
      .select("kiosk_session_id, device_number, store_id, last_active_at")
      .eq("status", "active")
      .lt("last_active_at", fourHoursAgo.toISOString());

    if (selectError) {
      console.error("[terminate-inactive-sessions] Error selecting inactive sessions:", selectError);
      return new Response(
        JSON.stringify({ error: "Failed to query inactive sessions", details: selectError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      console.log("[terminate-inactive-sessions] No inactive sessions found to terminate.");
      return new Response(
        JSON.stringify({ message: "No inactive sessions found." }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[terminate-inactive-sessions] Found ${inactiveSessions.length} inactive session(s) to terminate.`);

    const sessionIdsToUpdate = inactiveSessions.map((s: any) => s.kiosk_session_id);

    const { error: updateError } = await supabaseAdmin
      .from("kiosk_sessions")
      .update({ status: "expired", expired_at: currentTime.toISOString() }) // Also update expired_at for clarity
      .in("kiosk_session_id", sessionIdsToUpdate);

    if (updateError) {
      console.error("[terminate-inactive-sessions] Error updating sessions to 'expired':", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update sessions", details: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[terminate-inactive-sessions] Successfully terminated ${inactiveSessions.length} session(s): ${sessionIdsToUpdate.join(", ")}`);
    inactiveSessions.forEach((session: any) => {
      console.log(`  - Terminated: ID=${session.kiosk_session_id}, Device=${session.device_number}, Store=${session.store_id}, LastActive=${session.last_active_at}`);
    });

    return new Response(
      JSON.stringify({ message: `Successfully terminated ${inactiveSessions.length} inactive session(s).`, terminated_ids: sessionIdsToUpdate }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[terminate-inactive-sessions] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred.", details: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// To deploy and schedule (e.g., every 30 minutes):
// 1. Ensure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set as environment secrets for this function.
//    You can set them in your Supabase project dashboard (Project Settings > Functions > terminate-inactive-sessions > Secrets)
//    or via the CLI before deployment if your CLI version supports it directly for function secrets:
//    supabase secrets set SUPABASE_URL=your_supabase_url
//    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
//
// 2. Deploy the function with a schedule (e.g., every 30 minutes):
//    Make sure your Supabase CLI is up to date.
//    supabase functions deploy terminate-inactive-sessions --no-verify-jwt --schedule "*/30 * * * *"
//
//    The --no-verify-jwt flag is used because this function will be called by the Supabase scheduler, not by a user or client app.
//    The function uses a service_role_key which bypasses RLS, so ensure this key is kept secure.
//
// Important Considerations:
// - Table Name: Ensure `kiosk_sessions` is the correct name of your table.
// - Column Names: Ensure `status`, `last_active_at`, `kiosk_session_id`, `device_number`, `store_id`, `expired_at` are correct.
// - Timezones: The function uses `new Date()`, which relies on the server's timezone where the function executes.
//   Supabase Edge Functions typically run in UTC. Ensure your `last_active_at` timestamps are also consistently stored (ideally in UTC).
// - Error Handling & Logging: The function includes basic logging. You can monitor these logs in your Supabase project dashboard (Logs > Edge Function Logs). 