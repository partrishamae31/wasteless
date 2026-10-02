import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase server configuration is incomplete." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return json({ error: "Unauthorized." }, 401);
    }

    // Verify that the caller owns the temporary Auth session.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const requestedUserId = String(body?.userId || "").trim();

    // Never allow this endpoint to delete another user's Auth account.
    if (!requestedUserId || requestedUserId !== user.id) {
      return json({ error: "Invalid signup user." }, 403);
    }

    // Use the service-role client only on the server for the Auth deletion.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Supabase may create the profiles row automatically when auth.signUp()
    // runs. Therefore, the existence of a profile row does NOT mean that
    // Step 5 was completed. Only block deletion when the profile contains
    // the registration details that are written during final submission.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, contact_number, barangay, role, address, business_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError);
      return json({ error: "Could not verify signup status." }, 500);
    }

    if (profile) {
      const hasCompletedRegistration =
        Boolean(profile.full_name?.trim()) &&
        Boolean(profile.email?.trim()) &&
        Boolean(profile.contact_number?.trim()) &&
        Boolean(profile.barangay?.trim()) &&
        Boolean(profile.role?.trim()) &&
        (profile.role !== "repair_shop" ||
          Boolean(profile.business_name?.trim()) ||
          Boolean(profile.address?.trim()));

      if (hasCompletedRegistration) {
        return json({
          deleted: false,
          reason: "profile_exists",
        });
      }
    }

    // Remove the automatically-created incomplete profile first. This keeps
    // an abandoned signup from leaving an orphaned profiles row behind.
    if (profile) {
      const { error: profileDeleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileDeleteError) {
        console.error("Temporary profile deletion failed:", profileDeleteError);
        return json({ error: "Could not cancel the unfinished signup." }, 500);
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Temporary Auth user deletion failed:", deleteError);
      return json({ error: "Could not cancel the unfinished signup." }, 500);
    }

    return json({ deleted: true });
  } catch (error) {
    console.error("cancel-unfinished-signup error:", error);
    return json({ error: "Could not cancel the unfinished signup." }, 500);
  }
});
