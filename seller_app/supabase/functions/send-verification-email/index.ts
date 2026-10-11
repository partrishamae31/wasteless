
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME") ?? "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") ?? "";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") ?? "";
const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? "";

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

const layout = (
  title: string,
  bodyHtml: string,
  button?: { label: string; url: string },
) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <h2 style="margin:0 0 16px;color:#0f172a">${escapeHtml(title)}</h2>
  ${bodyHtml}
  ${
    button?.url
      ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="background:#2d7a7f;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(button.label)}</a></p>`
      : ""
  }
  <p style="margin-top:32px;font-size:12px;color:#94a3b8">This is an automated message. Please do not reply.</p>
</div>`;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !safeEqual(provided, WEBHOOK_SECRET)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!SMTP_USERNAME || !SMTP_PASSWORD || !SMTP_FROM || !SMTP_HOSTNAME) {
    console.error("SMTP configuration is incomplete.");
    return json({ error: "Email service is not configured" }, 500);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const record = payload?.record;
  const oldRecord = payload?.old_record;

  if (!record?.id) return json({ skipped: "no record" });

  const status = String(record.verification_status ?? "").toLowerCase();
  const previous = String(oldRecord?.verification_status ?? "").toLowerCase();

  if (status === previous) {
    return json({ skipped: "status unchanged" });
  }

  const outcome =
    status === "verified" || status === "approved"
      ? "approved"
      : status === "rejected"
        ? "rejected"
        : null;

  if (!outcome) {
    return json({ skipped: `status "${status}" sends no email` });
  }

  let email: string = record.email ?? "";

  if (!email && SUPABASE_URL && SERVICE_ROLE_KEY) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin.auth.admin.getUserById(record.id);

    if (error) console.error("Could not look up auth user:", error.message);
    email = data?.user?.email ?? "";
  }

  if (!email) return json({ skipped: "no email address for user" });

  const name = record.business_name || record.full_name || "there";

  let subject: string;
  let html: string;

  if (outcome === "approved") {
    subject = "Your account has been verified";
    html = layout(
      "Your account is verified",
      `<p>Hi ${escapeHtml(name)},</p>
       <p>Good news — an administrator has reviewed and <strong>verified</strong> your account.
       You can now access the features available to your account.</p>`,
      { label: "Sign in", url: APP_URL },
    );
  } else {
    const reason = String(record.rejection_reason ?? "").trim();

    subject = "Your account verification was not approved";
    html = layout(
      "Verification not approved",
      `<p>Hi ${escapeHtml(name)},</p>
       <p>An administrator reviewed your verification request and could not approve it yet.
       Your account remains in <strong>view-only</strong> mode.</p>
       <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px">
         <strong>Reason:</strong> ${escapeHtml(reason || "No specific reason was provided.")}
       </p>
       <p>Please sign in, update your profile and credentials, and re-submit them for review.</p>`,
      { label: "Update my credentials", url: APP_URL },
    );
  }

  const mailer = nodemailer.createTransport({
    host: SMTP_HOSTNAME,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD,
    },
  });

  try {
    await mailer.sendMail({
      from: SMTP_FROM,
      to: email,
      subject,
      html,
    });

    return json({ sent: true, outcome, to: email });
  } catch (error) {
    console.error(
      "SMTP email failed:",
      error instanceof Error ? error.message : "Unknown SMTP error",
    );
    return json({ error: "Unable to send verification email" }, 502);
  } finally {
    mailer.close();
  }
});
