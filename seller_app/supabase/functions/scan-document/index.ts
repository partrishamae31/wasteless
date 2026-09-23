// supabase/functions/scan-document/index.ts
//
// Reads a government ID / business permit / technical certificate with Gemini
// and returns structured fields. The Gemini API key lives ONLY here, as a
// Supabase secret, so it never reaches the browser.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=your_key_from_aistudio
//   supabase functions deploy scan-document
//
// Optional secret (comma-separated, tried in order; first one that works wins):
//   supabase secrets set GEMINI_MODELS="gemini-2.5-flash,gemini-2.5-flash-lite"

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

// Base64 of a 5 MB file is ~6.7 MB. Leave a little headroom.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

const str = (description: string) => ({ type: "STRING", description });

const SCHEMAS: Record<string, { schema: unknown; prompt: string }> = {
  government_id: {
    prompt: `You are reading a Philippine government-issued ID (e.g. PhilSys National ID, driver's license, UMID, passport, postal ID, voter's ID, PRC ID).
Extract the holder's details exactly as printed. Rules:
- fullName: "Given Names Middle Name Last Name" order, in normal Title Case. Include suffixes such as Jr., Sr., III. Do NOT include labels, country codes or other text. Keep "Sta." / "Sta.Ana" style prefixes as printed.
- address: the full residential address as printed, on ONE line. If the ID has no address, return "".
- barangay: the barangay of the address. It must match one of the allowed barangays listed below (return the allowed spelling). If it is not visible or not in the list, return "".
- NEVER guess or invent. If a field is not clearly visible, return "".
- If the image is not an identity document, return "" for every field.`,
    schema: {
      type: "OBJECT",
      properties: {
        fullName: str("Given + middle + last name, Title Case"),
        address: str("Full address on one line"),
        barangay: str("Barangay from the allowed list, or empty string"),
      },
      required: ["fullName", "address", "barangay"],
    },
  },
  business_permit: {
    prompt: `You are reading a Philippine Business Permit / Mayor's Permit issued by a city or municipality.
Extract the details exactly as printed. Rules:
- fullName: the owner / proprietor / registered owner, Title Case. "" if only a corporation is named.
- businessName: the registered business or trade name exactly as printed.
- address: the business address as printed, on ONE line.
- barangay: the barangay of the business address. It must match one of the allowed barangays listed below (return the allowed spelling), otherwise "".
- contactNumber: a Philippine mobile or landline number if printed, otherwise "".
- businessPermitNumber: the permit / business permit / Mayor's permit number, without the label.
- permitType: e.g. "Mayor's Permit", "Business Permit".
- permitIssuingLgu: the issuing city/municipality, e.g. "City of Valenzuela".
- permitIssueDate and permitExpiryDate: ISO format YYYY-MM-DD. If only a year is given for validity (e.g. "valid until December 31, 2025"), convert it to a full date. Otherwise "".
- businessActivity: the nature of business / line of business.
- NEVER guess or invent. If a field is not clearly visible, return "".
- If the image is not a business permit, return "" for every field.`,
    schema: {
      type: "OBJECT",
      properties: {
        fullName: str("Owner name, Title Case"),
        businessName: str("Registered business/trade name"),
        address: str("Business address on one line"),
        barangay: str("Barangay from the allowed list, or empty string"),
        contactNumber: str("Philippine phone number or empty string"),
        businessPermitNumber: str("Permit number without label"),
        permitType: str("Type of permit"),
        permitIssuingLgu: str("Issuing city/municipality"),
        permitIssueDate: str("YYYY-MM-DD or empty string"),
        permitExpiryDate: str("YYYY-MM-DD or empty string"),
        businessActivity: str("Nature of business"),
      },
      required: [
        "fullName",
        "businessName",
        "address",
        "barangay",
        "contactNumber",
        "businessPermitNumber",
        "permitType",
        "permitIssuingLgu",
        "permitIssueDate",
        "permitExpiryDate",
        "businessActivity",
      ],
    },
  },
  technical_certificate: {
    prompt: `You are reading a technical / vocational certificate (e.g. TESDA National Certificate NC I–IV, DTI accreditation, manufacturer training certificate).
Extract the details exactly as printed. Rules:
- certificateNumber: the certificate / certification number, without the label.
- issuer: the organization that issued it (e.g. "TESDA").
- certificateTitle: the qualification or certificate title (e.g. "Consumer Electronics Servicing NC II").
- issueDate and expiryDate: ISO format YYYY-MM-DD, or "" if not printed.
- specialization: the field of specialization / competency, if printed.
- NEVER guess or invent. If a field is not clearly visible, return "".
- If the image is not a certificate, return "" for every field.`,
    schema: {
      type: "OBJECT",
      properties: {
        certificateNumber: str("Certificate number without label"),
        issuer: str("Issuing organization"),
        certificateTitle: str("Qualification or certificate title"),
        issueDate: str("YYYY-MM-DD or empty string"),
        expiryDate: str("YYYY-MM-DD or empty string"),
        specialization: str("Specialization or competency"),
      },
      required: [
        "certificateNumber",
        "issuer",
        "certificateTitle",
        "issueDate",
        "expiryDate",
        "specialization",
      ],
    },
  },
};

type GeminiAttempt =
  | { ok: true; fields: Record<string, string> }
  | { ok: false; status: number; reason: string; retryNextModel: boolean };

// One options object (not positional args) so arguments can never be swapped.
interface GeminiRequest {
  apiKey: string;
  model: string;
  prompt: string;
  schema: unknown;
  mimeType: string;
  base64Data: string;
}
const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async (req: GeminiRequest): Promise<GeminiAttempt> => {
  const { apiKey, model, prompt, schema, mimeType, base64Data } = req;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
  inlineData: {
    mimeType,
    data: base64Data,
  },
},
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    // Google's error body describes the problem (bad key, unknown model,
    // quota...) and never contains the document, so it is safe to log.
    let reason = `HTTP ${response.status}`;
    try {
      const message = JSON.parse(responseText)?.error?.message;
      if (message) reason = `HTTP ${response.status}: ${String(message).slice(0, 200)}`;
    } catch { /* keep the plain status */ }
    console.error(`scan-document: Gemini ${model} failed -> ${reason}`);

    return {
      ok: false,
      status: response.status,
      reason,
      // 400 covers "API key not valid" too, but trying the next model is harmless.
      retryNextModel: [400, 404, 429, 500, 503].includes(response.status),
    };
  }

  try {
    const result = JSON.parse(responseText);
    const text = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? "")
      .join("")
      .trim();

    if (!text) {
      // Usually a safety block or an empty candidate.
      const why = result?.promptFeedback?.blockReason ?? result?.candidates?.[0]?.finishReason ?? "no text";
      console.error(`scan-document: Gemini ${model} returned no text (${why})`);
      return { ok: false, status: 502, reason: `No text returned (${why})`, retryNextModel: true };
    }

    const parsed = JSON.parse(text);
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      fields[key] = typeof value === "string" ? value.trim() : "";
    }
    return { ok: true, fields };
  } catch (error) {
    console.error(`scan-document: Gemini ${model} returned unparsable output:`, error instanceof Error ? error.message : "unknown");
    return { ok: false, status: 502, reason: "Unparsable model output", retryNextModel: true };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    // Only signed-in users may spend the Gemini quota. (The anon key alone
    // passes the platform's JWT check, so verify a real user here.)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Please verify your email before scanning." }, 401);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Scanner is not configured." }, 500);

    const { documentType, mimeType, data, barangays } = await req.json();

    const config = SCHEMAS[documentType];
    if (!config) return json({ error: "Unknown document type." }, 400);
    if (!ALLOWED_MIME.has(mimeType)) {
      return json({ error: "Please upload a PDF, JPEG, PNG, or WebP file." }, 400);
    }
    if (typeof data !== "string" || !data || data.length > MAX_BASE64_LENGTH) {
      return json({ error: "File size must not exceed 5MB." }, 400);
    }

    const allowedBarangays = Array.isArray(barangays)
      ? barangays.filter((b: unknown) => typeof b === "string").slice(0, 100)
      : [];
    const prompt =
      allowedBarangays.length > 0
        ? `${config.prompt}\n\nAllowed barangays: ${allowedBarangays.join(", ")}.`
        : config.prompt;

    const models = (
  Deno.env.get("GEMINI_MODELS") ??
  "gemini-3.5-flash-lite,gemini-3.5-flash"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

    let lastStatus = 502;
let lastReason = "Unknown error";

const MAX_RETRIES_PER_MODEL = 2;

for (const model of models) {
  for (let retry = 0; retry <= MAX_RETRIES_PER_MODEL; retry++) {
    const attempt = await callGemini({
      apiKey,
      model,
      prompt,
      schema: config.schema,
      mimeType,
      base64Data: data,
    });

    if (attempt.ok) {
      return json({
        fields: attempt.fields,
        model,
      });
    }

    lastStatus = attempt.status;
    lastReason = attempt.reason;

    // Retry temporary Gemini capacity/rate/server errors.
    if ([429, 500, 503].includes(attempt.status)) {
      if (retry < MAX_RETRIES_PER_MODEL) {
        const delay = 1000 * Math.pow(2, retry);

        console.warn(
          `scan-document: ${model} returned HTTP ${attempt.status}. ` +
          `Retrying in ${delay}ms...`,
        );

        await sleep(delay);
        continue;
      }
    }

    // Move to the next model for errors that may be model-specific.
    if (attempt.retryNextModel) {
      break;
    }

    // Permanent error.
    break;
  }
}

    console.error("scan-document: all Gemini models failed. Last:", lastReason);
    return json(
      {
        error:
          lastStatus === 429
            ? "The scanner is busy right now."
            : "The scanner is unavailable right now.",
        // Shown in the browser console only, so problems are diagnosable.
        reason: lastReason,
        quota: lastStatus === 429,
      },
      lastStatus === 429 ? 429 : 502,
    );
  } catch (error) {
    console.error("scan-document failed:", error instanceof Error ? error.message : "unknown");
    return json({ error: "The scanner is unavailable right now." }, 500);
  }
});