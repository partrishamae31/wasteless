const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeDate(value: unknown): string {
  const text = cleanString(value);

  if (!text) {
    return "";
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // YYYY/MM/DD
  let match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (match) {
    const [, year, month, day] = match;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (match) {
    const [, month, day, year] = match;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (match) {
    const [, first, second, year] = match;

    const firstNumber = Number(first);
    const secondNumber = Number(second);

    // If first number is > 12, it must be DD/MM/YYYY.
    if (firstNumber > 12) {
      return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
    }

    // If second number is > 12, it must be MM/DD/YYYY.
    if (secondNumber > 12) {
      return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`;
    }
  }

  return "";
}

function extractJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // Try to find a JSON object inside Gemini's response.
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Only POST requests are allowed.",
      },
      405,
    );
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured.");

      return jsonResponse(
        {
          success: false,
          error: "The certificate scanning service is not configured.",
        },
        500,
      );
    }

    const body = await req.json();

    const mimeType = cleanString(body?.mimeType);
    const base64 = cleanString(body?.base64);

    if (!mimeType || !base64) {
      return jsonResponse(
        {
          success: false,
          error: "Missing certificate file data.",
        },
        400,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Unsupported file type. Please upload a PDF, JPEG, PNG, or WebP certificate.",
        },
        400,
      );
    }

    // Base64 is approximately 4/3 the size of the original file.
    const estimatedFileSize = Math.floor((base64.length * 3) / 4);

    if (estimatedFileSize > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          success: false,
          error: "The certificate file must be 5 MB or smaller.",
        },
        400,
      );
    }

    const prompt = `
You are an OCR and structured-data extraction assistant for the Wasteless
e-waste marketplace.

The uploaded document is expected to be a Philippine technical,
vocational, electronics, electrical, appliance-repair, computer-repair,
IT, or similar technical training/certification document.

Your task is ONLY to extract information that is visibly present in the
uploaded document.

Do NOT invent, guess, infer, or complete missing information.

Return ONLY valid JSON.
Do not use Markdown.
Do not include explanations outside the JSON.

Use this exact structure:

{
  "certificateNumber": "",
  "issuer": "",
  "certificateTitle": "",
  "issueDate": "",
  "expiryDate": "",
  "specialization": ""
}

FIELD RULES:

1. certificateNumber
- Extract the certificate number, certificate ID, registration number,
  credential number, or equivalent identifier.
- If none is visible, return an empty string.

2. issuer
- Extract the organization, institution, government agency, training center,
  school, company, or certification body that issued the certificate.
- If none is clearly visible, return an empty string.

3. certificateTitle
- Extract the official title/name of the certificate, qualification,
  certification, diploma, or credential.
- Examples can include titles such as a technical qualification,
  competency certificate, training certificate, or certification.
- Do not invent a title.

4. issueDate
- Extract the date the certificate was issued, awarded, granted, or released.
- Return it as YYYY-MM-DD.
- If the document does not clearly show an issue/award date, return "".

5. expiryDate
- Extract the expiration/valid-until date if explicitly shown.
- Return it as YYYY-MM-DD.
- If the certificate does not have an expiration date, return "".
- Do NOT calculate an expiration date.

6. specialization
- Extract the technical field, specialization, qualification,
  competency, or area of expertise stated on the document.
- Examples may include electronics, electrical installation,
  computer systems servicing, appliance repair, mobile phone repair,
  computer repair, or similar fields.
- Only use information actually shown on the document.
- If none is visible, return "".

IMPORTANT:
- Preserve names and certificate numbers as they appear.
- Do not fabricate missing values.
- Do not treat a logo or seal alone as proof of authenticity.
- Do not state that the certificate is valid or authentic.
- This is text extraction only.
`;

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      console.error(
        "Gemini technical certificate error:",
        geminiResponse.status,
        errorText,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The technical certificate scanning service could not process the document.",
        },
        502,
      );
    }

    const geminiData = await geminiResponse.json();

    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part?.text ?? "")
        .join("") ?? "";

    if (!generatedText) {
      console.error(
        "Gemini returned no text:",
        JSON.stringify(geminiData),
      );

      return jsonResponse(
        {
          success: false,
          error:
            "No information could be extracted from the technical certificate.",
        },
        502,
      );
    }

    const extracted = extractJson(generatedText);

    if (!extracted) {
      console.error(
        "Could not parse Gemini JSON:",
        generatedText,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The technical certificate could not be read. Please enter the details manually.",
        },
        502,
      );
    }

    const fields = {
      certificateNumber: cleanString(extracted.certificateNumber),
      issuer: cleanString(extracted.issuer),
      certificateTitle: cleanString(extracted.certificateTitle),
      issueDate: normalizeDate(extracted.issueDate),
      expiryDate: normalizeDate(extracted.expiryDate),
      specialization: cleanString(extracted.specialization),
    };

    console.log(
      "Technical certificate extraction completed:",
      JSON.stringify(fields),
    );

    return jsonResponse({
      success: true,
      fields,
    });
  } catch (error) {
    console.error("scan-technical-certificate error:", error);

    return jsonResponse(
      {
        success: false,
        error:
          "The technical certificate could not be processed. Please enter the details manually.",
      },
      500,
    );
  }
});