import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Deletes the calling user's account in full:
 *   1. Validates the user's access token (Bearer in Authorization header).
 *   2. Removes their rows from `user_data` (RLS-compliant — service role).
 *   3. Deletes the auth user via the admin API.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` server-side. That key is secret and is
 * never exposed to the browser (no NEXT_PUBLIC_ prefix).
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !serviceRole) {
    return NextResponse.json(
      { message: "Account deletion is not configured on the server." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ message: "Missing Authorization header." }, { status: 401 });
  }

  // Verify the user by their own access token.
  const verifyClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: userData, error: getUserError } = await verifyClient.auth.getUser(token);
  if (getUserError || !userData.user) {
    return NextResponse.json({ message: "Invalid session." }, { status: 401 });
  }
  const userId = userData.user.id;

  // Admin client (service role) — bypasses RLS, can delete the auth user.
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

  const { error: dataError } = await admin.from("user_data").delete().eq("user_id", userId);
  if (dataError) {
    return NextResponse.json(
      { message: `Failed to delete user data: ${dataError.message}` },
      { status: 500 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json(
      { message: `Failed to delete account: ${deleteError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
