import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Upload, MapPin } from "lucide-react";
import { createWorker } from "tesseract.js";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BARANGAY_COORDINATES = {
  "Arkong Bato": [14.6756, 120.9576],
  Bagbaguin: [14.7038, 120.9973],
  Balangkas: [14.6768, 120.9696],
  Bignay: [14.7002, 121.0165],
  Bisig: [14.6852, 120.9664],
  "Canumay East": [14.6908, 120.9884],
  "Canumay West": [14.6877, 120.9794],

  // Corrected Coloong location
  Coloong: [14.7240, 120.9433],

  Dalandanan: [14.6918, 120.9785],
  "Gen. T. de Leon": [14.6907, 121.0122],
  Isla: [14.6888, 120.9607],
  Karuhatan: [14.6847, 120.9747],
  "Lawang Bato": [14.7154, 121.0034],
  Lingunan: [14.6984, 120.9819],
  Mabolo: [14.6786, 120.9845],
  Malanday: [14.7024, 120.9711],
  Malinta: [14.6798, 120.9707],
  "Mapulang Lupa": [14.7155, 121.0173],
  Marulas: [14.6737, 120.9659],
  Maysan: [14.6950, 120.9922],
  Palasan: [14.6808, 120.9745],
  "Pariancillo Villa": [14.6818, 120.9596],
  "Paso de Blas": [14.7105, 120.9960],
  Pasolo: [14.7093, 120.9600],
  Poblacion: [14.6911, 120.9661],
  Pulo: [14.6971, 120.9672],
  Punturin: [14.7237, 121.0180],
  Rincon: [14.6780, 120.9507],
  Tagalag: [14.7163, 120.9494],
  Ugong: [14.6736, 121.0142],
  "Veinte Reales": [14.7104, 121.0051],
  "Wawang Pulo": [14.7285, 120.9604],
};

const VALENZUELA_CENTER = [14.676, 120.983];

const repairShopPin = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const LocationSelector = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      icon={repairShopPin}
      draggable={true}
      eventHandlers={{
        dragend: (event) => {
          const marker = event.target;
          const location = marker.getLatLng();

          onChange([location.lat, location.lng]);
        },
      }}
    />
  );
};


const OCR_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const OCR_MAX_FILE_SIZE = 5 * 1024 * 1024;

const cleanOcrText = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findLabelValue = (text, labels = []) => {
  const lines = cleanOcrText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const labelPattern = labels.map(escapeRegex).join("|");
  const regex = new RegExp(`^(?:${labelPattern})\\s*(?:[:#-]|No\\.?\\s*)?\\s*(.*)$`, "i");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(regex);
    if (match && match[1]?.trim()) return match[1].trim();

    const inline = new RegExp(`(?:${labelPattern})\\s*[:#-]\\s*(.+)$`, "i").exec(line);
    if (inline?.[1]?.trim()) return inline[1].trim();

    if (new RegExp(`^(?:${labelPattern})$`, "i").test(line) && lines[i + 1]) {
      return lines[i + 1].trim();
    }
  }

  return "";
};

const findDateValue = (text, labels = []) => {
  const value = findLabelValue(text, labels);
  if (value) {
    const match = value.match(/\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/);
    if (match) return match[0];
  }

  const lines = cleanOcrText(text).split("\n");
  const labelRegex = new RegExp(`(?:${labels.map(escapeRegex).join("|")})`, "i");
  for (const line of lines) {
    if (!labelRegex.test(line)) continue;
    const match = line.match(/\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/);
    if (match) return match[0];
  }
  return "";
};

const findContactNumber = (text) => {
  const match = cleanOcrText(text).match(/(?:\+63|0)9\d{9}|(?:\+63|0)\d{2}[ -]?\d{3}[ -]?\d{4}/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
};

const normalizeOcrForMatching = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const findBarangay = (text, barangays) => {
  const normalized = normalizeOcrForMatching(text);
  const lines = String(text || "").split(/\r?\n/).map((x) => normalizeOcrForMatching(x)).filter(Boolean);
  const aliases = {
    "GEN. T. DE LEON": ["GEN T DE LEON", "GEN T DE LEON", "GEN T DELEON", "GEN T DE LEON"],
    "PARIANCILLO VILLA": ["PARIANCILLO VILLA", "PARIANCILLOVILLA"],
    "PASO DE BLAS": ["PASO DE BLAS", "PASODEBLAS"],
    "CANUMAY EAST": ["CANUMAY EAST", "CANUMAYEAST"],
    "CANUMAY WEST": ["CANUMAY WEST", "CANUMAYWEST"],
    "VEINTE REALES": ["VEINTE REALES", "VEINTEREALES"],
    "WAWANG PULO": ["WAWANG PULO", "WAWANGPULO"],
  };
  const ordered = [...barangays].sort((a, b) => b.length - a.length);
  for (const barangay of ordered) {
    const key = normalizeOcrForMatching(barangay);
    const candidates = [key, ...(aliases[barangay] || []).map(normalizeOcrForMatching)];
    if (candidates.some((candidate) => candidate && (normalized.includes(candidate) || lines.some((line) => line.includes(candidate))))) {
      return barangay;
    }
  }

  // Common Tesseract confusions in the Valenzuela barangay names.
  const fuzzy = [
    ["MALINTA", ["MALINTA", "MALINIA", "MALINTA"]],
    ["MALANDAY", ["MALANDAY", "MALANDA", "MALANDAV"]],
    ["KARUHATAN", ["KARUHATAN", "KARUHATAN", "KARUHATAN"]],
    ["MAYSAN", ["MAYSAN", "MAY5AN", "MAY SAN"]],
    ["MARULAS", ["MARULAS", "MARULA5"]],
    ["DALANDANAN", ["DALANDANAN", "DALANDANAN"]],
  ];
  for (const [barangay, variants] of fuzzy) {
    if (variants.some((v) => normalized.includes(normalizeOcrForMatching(v)))) return barangay;
  }
  return "";
};

const cleanNamePart = (value) => {
  if (!value) return "";

  return String(value)
    .replace(/[|_\[\]{}<>~`\\]/g, " ")
    .replace(/\b(?:MGA|PANGALAN|GIVEN|NAMES?|GITNANG|MIDDLE|APELYIDO|LAST|NAME)\b/gi, " ")
    .replace(/[^A-Za-zÀ-ÿ.'\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const isLikelyNameValue = (value) => {
  const cleaned = cleanNamePart(value);
  if (!cleaned) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 6) return false;

  const noise = new Set([
    "PH", "PHL", "NG", "IB", "IA", "ID", "DIGITAL", "NUMBER",
    "DATE", "BIRTH", "REPUBLIKA", "PILIPINAS", "REPUBLIC",
    "OF", "THE", "PHILIPPINES", "CARD", "IDENTIFICATION",
  ]);

  const useful = words.filter((word) => !noise.has(word.toUpperCase()));
  if (!useful.length) return false;

  // Reject obvious OCR garbage, but allow normal mixed-case names.
  const alphaCount = useful.reduce((count, word) =>
    count + (word.match(/[A-Za-zÀ-ÿ]/g) || []).length, 0);
  if (alphaCount < 2) return false;

  return useful.every((word) => /^[A-Za-zÀ-ÿ.'-]+$/.test(word));
};

const getOcrLines = (text) =>
  cleanOcrText(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

// OCR from Philippine National IDs frequently damages the bilingual labels.
// These patterns intentionally tolerate common Tesseract mistakes such as:
// "Apelydo", "Apetydol", "Fangatan", "Goren Nemes", "Meddie Nose", etc.
const NAME_LABEL_PATTERNS = {
  last: [
    // Normal: APELYIDO / LAST NAME
    /(?:APELYIDO|APELYDO|APETLYIDO|APETYDO|APRTYDO|APRTPRT|APETPRT|APEL[I1]Y?DO)/i,
    // OCR example: "Aprtprtuyiant Ruse" (intended: Apelyido/Last Name)
    /(?:APR|AP[ER]T|APEL)[A-Z]{2,}.*(?:RUSE|NAME|RUSE?)/i,
    /LAST\s*NAME?/i,
  ],
  given: [
    // Normal: MGA PANGALAN / GIVEN NAMES
    /(?:MGA\s*)?(?:PANGALAN|FANGALAN|PANGATAN|FANGATAN)/i,
    /(?:GIVEN|GOREN|G[O0]VEN)\s*NAME?/i,
    // OCR example: "Fang 7 aren Numes"
    /FANG[A-Z0-9 ._-]*(?:GIVEN|GOREN|AREN|NUME|NAME)/i,
  ],
  middle: [
    // Normal and common OCR variants of GITNANG APELYIDO / MIDDLE NAME
    /(?:GITNANG|TTNANG|TINNANG|GITNAG)/i,
    /(?:MIDDLE|MEDDIE|MIDDIE|M[EI]DDLE|MADDIE)\s*NAME?/i,
  ],
};
const isNameLabelLine = (line) =>
  NAME_LABEL_PATTERNS.last.some((re) => re.test(line)) ||
  NAME_LABEL_PATTERNS.given.some((re) => re.test(line)) ||
  NAME_LABEL_PATTERNS.middle.some((re) => re.test(line));

const findNameValueAfterPatterns = (lines, patterns, maxLookAhead = 6) => {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const pattern = patterns.find((re) => re.test(line));
    if (!pattern) continue;

    // First try text remaining on the same line after the label.
    const match = line.match(pattern);
    if (match) {
      const sameLine = line
        .slice((match.index ?? 0) + match[0].length)
        .replace(/^[:\-\s]+/, "")
        .trim();
      if (isLikelyNameValue(sameLine)) return cleanNamePart(sameLine);
    }

    // Then inspect the next several lines. OCR often puts the field value
    // one or two lines below the damaged label.
    for (let j = i + 1; j <= Math.min(lines.length - 1, i + maxLookAhead); j += 1) {
      const candidate = cleanNamePart(lines[j]);
      if (!candidate || isNameLabelLine(lines[j])) continue;
      if (/^(?:PETSA|DATE|TIRAHAN|ADDRESS|DIGITAL|NUMBER|SIGNATURE|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b/i.test(candidate)) continue;
      if (isLikelyNameValue(candidate)) return candidate;
    }
  }
  return "";
};

const findGovernmentIdNameParts = (text) => {
  const lines = getOcrLines(text);

  const lastName = findNameValueAfterPatterns(lines, NAME_LABEL_PATTERNS.last, 6);
  const givenNames = findNameValueAfterPatterns(lines, NAME_LABEL_PATTERNS.given, 6);
  const middleName = findNameValueAfterPatterns(lines, NAME_LABEL_PATTERNS.middle, 6);

  return {
    givenNames: cleanNamePart(givenNames),
    middleName: cleanNamePart(middleName),
    lastName: cleanNamePart(lastName),
  };
};

const normalizeNameForComparison = (value) =>
  cleanNamePart(value)
    .toUpperCase()
    .replace(/\bSTA\s*\.?\s*ANA\b/g, "STA.ANA")
    .replace(/\s+/g, " ")
    .trim();

const buildGovernmentIdFullName = (parts, text) => {
  let { givenNames, middleName, lastName } = parts;
  const lines = getOcrLines(text);

  // Recover a surname when the label is readable but its value was separated
  // by OCR noise. This is especially useful for one-token surnames.
  if (!lastName) {
    const lastIndex = lines.findIndex((line) =>
      NAME_LABEL_PATTERNS.last.some((re) => re.test(line)),
    );
    if (lastIndex >= 0) {
      for (let i = lastIndex + 1; i <= Math.min(lines.length - 1, lastIndex + 7); i += 1) {
        const candidate = cleanNamePart(lines[i]);
        if (!candidate || isNameLabelLine(lines[i])) continue;
        if (/^(?:PETSA|DATE|TIRAHAN|ADDRESS|DIGITAL|NUMBER|SIGNATURE)\b/i.test(candidate)) continue;
        if (isLikelyNameValue(candidate)) {
          lastName = candidate;
          break;
        }
      }
    }
  }

  // Remove tiny OCR noise tokens that commonly appear beside given names.
  givenNames = givenNames
    .split(/\s+/)
    .filter((word) => !/^(NG|PH|PHL|IB|IA)$/i.test(word))
    .join(" ");

  const normalizePart = (value) =>
    cleanNamePart(value)
      .replace(/\bSTA\s+ANA\b/gi, "Sta.Ana")
      .replace(/\bSTA\.\s*ANA\b/gi, "Sta.Ana")
      .replace(/\s+/g, " ")
      .trim();

  const ordered = [givenNames, middleName, lastName]
    .map(normalizePart)
    .filter(Boolean);

  const unique = [];
  for (const part of ordered) {
    const key = normalizeNameForComparison(part);
    if (key && !unique.some((existing) => normalizeNameForComparison(existing) === key)) {
      unique.push(part);
    }
  }

  return unique.join(" ").replace(/\s+/g, " ").trim();
};

const findNameFallback = (text) => {
  const value = findLabelValue(text, [
    "FULL NAME",
    "FULLNAME",
    "NAME OF OWNER",
    "REGISTERED OWNER",
    "OWNER'S NAME",
    "OWNER",
    "APPLICANT NAME",
    "APPLICANT",
    "NAME",
  ]);
  if (!value) return "";
  return cleanNamePart(value);
};

const findAddressFallback = (text) => {
  const labeled = findLabelValue(text, [
    "BUSINESS ADDRESS",
    "BUSINESS/SHOP ADDRESS",
    "SHOP ADDRESS",
    "PRINCIPAL ADDRESS",
    "RESIDENTIAL ADDRESS",
    "HOME ADDRESS",
    "ADDRESS",
    "LOCATION",
  ]);

  if (labeled) return labeled;

  // Philippine National ID OCR frequently loses the "ADDRESS" label but
  // retains the long address itself. Recover a line containing the street
  // and Valenzuela location, then join the following continuation lines.
  const lines = getOcrLines(text);
  const addressStart = lines.findIndex((line) =>
    /(?:MERCEDES|ST\.?|STREET|ROAD|RD\.?|CITY|VALENZUELA|NCR|PHILIPPINES|PHL|1442)/i.test(line),
  );

  if (addressStart >= 0) {
    const collected = [];
    for (let i = addressStart; i < Math.min(lines.length, addressStart + 5); i += 1) {
      const line = lines[i];
      if (/^(?:PETA|PETSA|DATE OF BIRTH|DIGITAL ID|SIGNATURE)/i.test(line)) break;
      if (/\b(?:VALENZUELA|NCR|PHILIPPINES|PHL)\b/i.test(line) || /\d{3,}/.test(line) || /\b(?:ST|STREET|ROAD|RD)\b/i.test(line)) {
        collected.push(line);
      }
    }
    if (collected.length) {
      return collected
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/\bCITY OF PHL\b/gi, "CITY OF VALENZUELA")
        .trim();
    }
  }

  return "";
};

const parseGovernmentIdOcr = (text, barangays) => {
  const parts = findGovernmentIdNameParts(text);
  const fullName = buildGovernmentIdFullName(parts, text);

  // Last-resort generic name extraction. This prevents the scanner from
  // failing completely when the ID labels are distorted.
  const fallbackName = findNameFallback(text);

  return {
    fullName: fullName || fallbackName,
    address: findAddressFallback(text),
    barangay: findBarangay(text, barangays),
  };
};

const parseBusinessPermitOcr = (text) => ({
  fullName: findLabelValue(text, ["OWNER", "OWNER NAME", "PROPRIETOR", "REGISTERED OWNER", "APPLICANT", "APPLICANT NAME"]),
  businessName: findLabelValue(text, ["BUSINESS NAME", "NAME OF BUSINESS", "TRADE NAME", "REGISTERED BUSINESS NAME"]),
  address: findAddressFallback(text),
  contactNumber: findContactNumber(text),
  businessPermitNumber: findLabelValue(text, ["BUSINESS PERMIT NO", "BUSINESS PERMIT NUMBER", "PERMIT NO", "PERMIT NUMBER", "MAYOR'S PERMIT NO", "MAYORS PERMIT NO"]),
  permitType: findLabelValue(text, ["PERMIT TYPE", "TYPE OF PERMIT"]),
  permitIssuingLgu: findLabelValue(text, ["ISSUING LGU", "ISSUING AUTHORITY", "LOCAL GOVERNMENT UNIT", "CITY/MUNICIPALITY", "CITY OF"]),
  permitIssueDate: findDateValue(text, ["ISSUE DATE", "DATE ISSUED", "DATE OF ISSUE"]),
  permitExpiryDate: findDateValue(text, ["EXPIRY DATE", "EXPIRATION DATE", "VALID UNTIL", "VALIDITY"]),
  businessActivity: findLabelValue(text, ["BUSINESS ACTIVITY", "NATURE OF BUSINESS", "BUSINESS NATURE", "ACTIVITY"]),
});

const parseTechnicalCertificateOcr = (text) => ({
  // Some technical certificates identify the technician/owner and shop.
  // Capture those fields too so the second document can reinforce the
  // information already extracted from the business permit.
  fullName: findLabelValue(text, [
    "OWNER",
    "OWNER NAME",
    "NAME OF OWNER",
    "PROPRIETOR",
    "REGISTERED OWNER",
    "APPLICANT",
    "APPLICANT NAME",
    "TECHNICIAN",
    "TECHNICIAN NAME",
    "CERTIFICATE HOLDER",
    "NAME OF HOLDER",
    "HOLDER",
  ]),
  businessName: findLabelValue(text, [
    "BUSINESS NAME",
    "NAME OF BUSINESS",
    "TRADE NAME",
    "REGISTERED BUSINESS NAME",
    "SHOP NAME",
    "SHOP",
    "COMPANY NAME",
  ]),
  address: findLabelValue(text, [
    "BUSINESS ADDRESS",
    "BUSINESS/SHOP ADDRESS",
    "SHOP ADDRESS",
    "PRINCIPAL ADDRESS",
    "OFFICE ADDRESS",
    "ADDRESS",
    "LOCATION",
  ]),
  certificateNumber: findLabelValue(text, ["CERTIFICATE NO", "CERTIFICATE NUMBER", "CERTIFICATION NO", "CERTIFICATION NUMBER", "CERT NO", "CERT NO."]),
  issuer: findLabelValue(text, ["ISSUER", "ISSUED BY", "ISSUING ORGANIZATION", "ISSUING BODY", "CERTIFYING BODY"]),
  certificateTitle: findLabelValue(text, ["CERTIFICATE TITLE", "CERTIFICATION TITLE", "TITLE OF CERTIFICATE", "CERTIFICATION"]),
  issueDate: findDateValue(text, ["ISSUE DATE", "DATE ISSUED", "DATE OF ISSUE"]),
  expiryDate: findDateValue(text, ["EXPIRY DATE", "EXPIRATION DATE", "VALID UNTIL", "VALID THROUGH"]),
  specialization: findLabelValue(text, ["SPECIALIZATION", "SPECIALTY", "FIELD OF SPECIALIZATION", "COMPETENCY", "QUALIFICATION"]),
});

const loadImageForOcr = async (file) => {
  if (!file || file.size > OCR_MAX_FILE_SIZE) {
    throw new Error("File size must not exceed 5MB.");
  }

  if (OCR_IMAGE_TYPES.includes(file.type)) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(2, Math.max(1, 1800 / Math.max(bitmap.width, bitmap.height)));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  if (file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    if (!pdf.numPages) throw new Error("The PDF does not contain a readable page.");

    // Tesseract.js does not read PDFs directly. Render the first page locally
    // with pdf.js, then send the rendered image to Tesseract.
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, Math.max(1.5, 1800 / Math.max(baseViewport.width, baseViewport.height)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  throw new Error("Please upload a PDF, JPEG, PNG, or WebP file.");
};

const createOcrVariants = (sourceCanvas) => {
  const variants = [sourceCanvas];
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Variant 1: high-contrast grayscale.
  const grayCanvas = document.createElement("canvas");
  grayCanvas.width = width;
  grayCanvas.height = height;
  const grayCtx = grayCanvas.getContext("2d", { willReadFrequently: true });
  grayCtx.drawImage(sourceCanvas, 0, 0);
  const imageData = grayCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
    const boosted = Math.max(0, Math.min(255, Math.round((gray - 128) * 1.45 + 128)));
    pixels[i] = boosted;
    pixels[i + 1] = boosted;
    pixels[i + 2] = boosted;
  }
  grayCtx.putImageData(imageData, 0, 0);
  variants.push(grayCanvas);

  // Variant 2: thresholded document. This often recovers small surnames
  // that Tesseract misses in the normal grayscale pass.
  const thresholdCanvas = document.createElement("canvas");
  thresholdCanvas.width = width;
  thresholdCanvas.height = height;
  const thresholdCtx = thresholdCanvas.getContext("2d", { willReadFrequently: true });
  thresholdCtx.drawImage(sourceCanvas, 0, 0);
  const thresholdData = thresholdCtx.getImageData(0, 0, width, height);
  const thresholdPixels = thresholdData.data;
  for (let i = 0; i < thresholdPixels.length; i += 4) {
    const gray = thresholdPixels[i] * 0.299 + thresholdPixels[i + 1] * 0.587 + thresholdPixels[i + 2] * 0.114;
    const value = gray > 155 ? 255 : 0;
    thresholdPixels[i] = value;
    thresholdPixels[i + 1] = value;
    thresholdPixels[i + 2] = value;
  }
  thresholdCtx.putImageData(thresholdData, 0, 0);
  variants.push(thresholdCanvas);

  return variants;
};

const runLocalOcr = async (file, onProgress, options = {}) => {
  const image = await loadImageForOcr(file);
  const variants = options.multiPass ? createOcrVariants(image) : [image];
  const worker = await createWorker("eng", 1, { logger: (message) => onProgress?.(message) });

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      tessedit_pageseg_mode: "6",
    });

    const results = [];
    for (let i = 0; i < variants.length; i += 1) {
      onProgress?.({ status: `OCR pass ${i + 1}/${variants.length}` });
      const { data } = await worker.recognize(variants[i]);
      const text = cleanOcrText(data?.text || "");
      if (text) results.push(text);
    }

    const text = cleanOcrText(
      results
        .join("\n")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line, index, array) => array.indexOf(line) === index)
        .join("\n"),
    );

    if (!text) throw new Error("No readable text was found in the document.");
    return text;
  } finally {
    await worker.terminate();
  }
};

// =====================================================================
// GEMINI SCAN (via Supabase Edge Function "scan-document")
// The API key stays on the server. If Gemini is busy / over its free
// quota / offline, we automatically fall back to the local Tesseract
// scan above so the user is never blocked.
// =====================================================================
const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// <input type="date"> needs YYYY-MM-DD. Gemini already returns that; this
// also cleans up the raw strings produced by the local OCR fallback.
const toIsoDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const valid = (y, m, d) => y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

  let m = raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (m && valid(+m[1], +m[2], +m[3])) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    // Philippine documents are normally MM/DD/YYYY; flip only if that is impossible.
    const [month, day] = a > 12 ? [b, a] : [a, b];
    if (valid(y, month, day)) return `${y}-${pad(month)}-${pad(day)}`;
  }

  m = raw.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    if (month && valid(+m[3], month, +m[2])) return `${m[3]}-${pad(month)}-${pad(m[2])}`;
  }
  return "";
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });

const scanWithGemini = async (file, documentType, barangays) => {
  const data = await fileToBase64(file);
  const { data: result, error } = await supabase.functions.invoke("scan-document", {
    body: {
      documentType,
      mimeType: file.type === "image/jpg" ? "image/jpeg" : file.type,
      data,
      barangays,
    },
  });
  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.clone?.().json();
      detail = body?.reason || body?.error || detail;
    } catch {
      // Body was not JSON (e.g. function not deployed -> 404/"Failed to send a request").
    }
    throw new Error(detail);
  }
  if (!result?.fields) throw new Error(result?.error || "The scanner returned no data.");
  return result.fields;
};

// Tesseract often returns scrambled letters for names. When the offline scan is
// the source, only auto-fill a name that looks like a real one; otherwise leave
// the field empty so the user types it instead of correcting garbage.
const looksLikeRealName = (value) => {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.every((token) => {
    if (!/^[A-Za-z][A-Za-z.'-]*$/.test(token)) return false; // digits/symbols
    if (/^[A-Za-z]\.?$/.test(token)) return true; // middle initial
    if (/^(?:Jr|Sr|II|III|IV|Mc|Mac)\.?$/i.test(token)) return true; // suffixes / prefixes
    if (token.length < 2 || token.length > 20) return false;
    if (!/[aeiouAEIOU]/.test(token)) return false; // no vowel
    if (/[^aeiouAEIOU\W\d_]{5,}/.test(token)) return false; // 5+ consonants in a row
    return true;
  });
};

// Tries Gemini first, falls back to local OCR. Always returns the same
// shape the rest of the form already expects.
const extractDocument = async ({ file, documentType, barangays, onStatus, localParser, localOptions }) => {
  let extracted = {};
  let source = "gemini";
  let localText = "";

  const hasStructuredFields = (value) =>
    value &&
    Object.values(value).some((item) => String(item ?? "").trim());

  try {
    onStatus?.("Reading document with AI…");
    extracted = await scanWithGemini(file, documentType, barangays);

    // A successful Edge Function response can still contain an empty/partial
    // extraction. In that case, run local OCR instead of reporting "scan failed".
    if (!hasStructuredFields(extracted)) {
      throw new Error("The AI scanner returned no readable fields.");
    }
  } catch (error) {
    console.warn("[scan] AI scan unavailable/incomplete, using offline OCR. Reason:", error?.message || error);
    source = "local";

    try {
      localText = await runLocalOcr(
        file,
        (message) =>
          message?.status &&
          onStatus?.(`Using offline scan… ${message.status}`),
        localOptions,
      );
    } catch (localError) {
      console.error("[scan] Offline OCR failed:", localError);
      throw new Error(
        "We couldn't read this document. Please upload a clear PDF or image and try scanning again.",
      );
    }

    console.log("Local OCR text:", localText);
    extracted = localParser(localText) || {};

    if (extracted.fullName && !looksLikeRealName(extracted.fullName)) {
      console.warn(
        "[scan] Offline OCR name looked scrambled, leaving it empty:",
        extracted.fullName,
      );
      extracted = { ...extracted, fullName: "" };
    }

    // Even when the document has readable text but none of the expected
    // labels were detected, keep the scan usable for manual review instead
    // of showing a technical "scan failed" message.
    if (!hasStructuredFields(extracted) && localText.trim()) {
      extracted = { ...extracted, _readableTextFound: true };
    }
  }

  // Only accept a barangay that really exists in the dropdown list.
  const barangay =
    findBarangay(extracted.barangay || "", barangays) ||
    findBarangay(extracted.address || "", barangays) ||
    (localText ? findBarangay(localText, barangays) : "");

  return {
    source,
    readableTextFound: Boolean(localText.trim()) || hasStructuredFields(extracted),
    extracted: {
      ...extracted,
      barangay,
      permitIssueDate: toIsoDate(extracted.permitIssueDate),
      permitExpiryDate: toIsoDate(extracted.permitExpiryDate),
      issueDate: toIsoDate(extracted.issueDate),
      expiryDate: toIsoDate(extracted.expiryDate),
    },
  };
};

const SignUp = ({ onLoginClick }) => {
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [idScanCompleted, setIdScanCompleted] = useState(false);
  const [permitScanCompleted, setPermitScanCompleted] = useState(false);
  const [techCertScanCompleted, setTechCertScanCompleted] = useState(false);
  const [registrationSummaryReady, setRegistrationSummaryReady] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanningId, setScanningId] = useState(false);
  const [scanningPermit, setScanningPermit] = useState(false);
  const [scanningTechCert, setScanningTechCert] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [shopLocation, setShopLocation] = useState(null);
  const governmentIdRef = React.useRef();
  const permitRef = React.useRef();
  const techRef = React.useRef();
  const scanInFlightRef = React.useRef(false);
  const valenzuelaBarangays = [
    "Arkong Bato",
    "Bagbaguin",
    "Balangkas",
    "Bignay",
    "Bisig",
    "Canumay East",
    "Canumay West",
    "Coloong",
    "Dalandanan",
    "Gen. T. de Leon",
    "Isla",
    "Karuhatan",
    "Lawang Bato",
    "Lingunan",
    "Mabolo",
    "Malanday",
    "Malinta",
    "Mapulang Lupa",
    "Marulas",
    "Maysan",
    "Palasan",
    "Pariancillo Villa",
    "Paso de Blas",
    "Pasolo",
    "Poblacion",
    "Pulo",
    "Punturin",
    "Rincon",
    "Tagalag",
    "Ugong",
    "Veinte Reales",
    "Wawang Pulo",
  ];

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    barangay: "",
    password: "",
    confirmPassword: "",

    // Repair Shop
    businessName: "",
    address: "",
    governmentId: null,
    businessPermit: null,
    businessPermitNumber: "",
    permitType: "",
    permitIssuingLgu: "",
    permitIssueDate: "",
    permitExpiryDate: "",
    businessActivity: "",
    certificationType: "",
    otherCertification: "",
    techCert: null,
    techCertificateNumber: "",
    techCertificateIssuer: "",
    techCertificateTitle: "",
    techCertificateIssueDate: "",
    techCertificateExpiryDate: "",
    techSpecialization: "",
  });

  const certificationOptions = [
    {
      value: "NC I",
      label: "NC I — Electronics Products Assembly and Servicing",
    },
    {
      value: "NC II",
      label: "NC II — Consumer Electronics Servicing",
    },
    {
      value: "NC III",
      label: "NC III — Industrial Electronics Servicing",
    },
    {
      value: "TESDA COC",
      label: "TESDA Certificate of Competency (COC)",
    },
    {
      value: "DTI Accreditation",
      label: "DTI Accreditation",
    },
    {
      value: "DepEd Tech-Voc Completion",
      label: "DepEd Tech-Voc Completion",
    },
    {
      value: "Other Certification",
      label: "Other Certification",
    },
  ];

  const [errors, setErrors] = useState({});

  // =========================
  // Turn a raw Supabase/Auth error into something a
  // non-technical user can actually understand and act on.
  // Nothing from err.code / err.status / err.name / stack
  // traces should ever reach the UI — only these messages.
  // =========================
  const getFriendlyErrorMessage = (err, fallback = "Something went wrong. Please try again in a moment.") => {
    const raw = `${err?.message || ""} ${err?.error_description || err?.msg || ""}`.toLowerCase();

    // Supabase can fail signup with a generic 500 "Database error saving
    // new user" when a backend trigger hits the unique email constraint
    // instead of returning its normal "already registered" error.
    if (
      raw.includes("already registered") ||
      raw.includes("already exists") ||
      raw.includes("duplicate") ||
      raw.includes("database error saving new user") ||
      (raw.includes("could not send verification code") && raw.includes("new user"))
    ) {
      return "An account with this email already exists. Please log in instead, or use a different email address.";
    }
    if (raw.includes("invalid login credentials")) {
      return "Incorrect email or password.";
    }
    if (raw.includes("expired") || (raw.includes("otp") && raw.includes("invalid")) || raw.includes("token is invalid")) {
      return "That verification code is invalid or has expired. Please request a new one.";
    }
    if (raw.includes("rate limit") || raw.includes("too many requests")) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (raw.includes("password")) {
      return "Your password doesn't meet the requirements. Please check and try again.";
    }
    if (raw.includes("network") || raw.includes("fetch") || raw.includes("failed to fetch")) {
      return "We couldn't reach the server. Please check your internet connection and try again.";
    }
    return fallback;
  };

  // Edge Function scan errors are sometimes genuinely useful to the user
  // ("Could not read the ID clearly") and sometimes raw backend/runtime
  // noise (stack traces, SQL/HTTP errors). Only pass through the former.
  const isUserFacingScanMessage = (message) => {
    if (!message || typeof message !== "string") return false;
    const technicalMarkers = /(error|exception|traceback|at\s+\w+\s*\(|status code|5\d{2}|unexpected_failure|sql|stack)/i;
    return !technicalMarkers.test(message) && message.length < 160;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Set the initial repair-shop map position
    // based on the selected barangay.
    if (
      name === "barangay" &&
      accountType === "repair_shop" &&
      BARANGAY_COORDINATES[value]
    ) {
      setShopLocation(BARANGAY_COORDINATES[value]);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF, JPEG, PNG, or WebP file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must not exceed 5MB.");
      e.target.value = "";
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));

    if (field === "governmentId") {
      setIdScanCompleted(false);
      setScanMessage("");
    }
    if (field === "businessPermit") {
      setPermitScanCompleted(false);
      setScanMessage("");
    }
    if (field === "techCert") {
      setTechCertScanCompleted(false);
      setScanMessage("");
    }

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const getScanErrorMessage = async (error, fallback) => {
    if (error?.context) {
      try {
        const response = error.context.clone();
        const text = await response.text();
        if (text) {
          try {
            const body = JSON.parse(text);
            if (typeof body?.error === "string" && body.error.trim()) return body.error.trim();
          } catch {
            // Ignore non-JSON response bodies.
          }
        }
      } catch {
        // Fall through to the existing friendly fallback.
      }
    }
    return isUserFacingScanMessage(error?.message) ? error.message : fallback;
  };

  const scanGovernmentId = async () => {
    const file = governmentIdRef.current?.files?.[0] || formData.governmentId;
    if (!file) { alert("Please upload your government ID first."); return; }
    if (!OCR_IMAGE_TYPES.includes(file.type) && file.type !== "application/pdf") {
      alert("Please upload a PDF, JPEG, PNG, or WebP ID."); return;
    }
    if (file.size > OCR_MAX_FILE_SIZE) {
      alert("File size must not exceed 5MB."); return;
    }

    setScanningId(true);
    setScanMessage("Scanning ID…");
    try {
      const { extracted, source } = await extractDocument({
        file,
        documentType: "government_id",
        barangays: valenzuelaBarangays,
        onStatus: setScanMessage,
        localParser: (text) => parseGovernmentIdOcr(text, valenzuelaBarangays),
        localOptions: { multiPass: true },
      });
      const hasName = Boolean(extracted.fullName?.trim());
      const hasAddress = Boolean(extracted.address?.trim());
      const hasBarangay = Boolean(extracted.barangay);

      // The registration flow treats the ID scan as complete only when the
      // three registration-critical identity/location fields are available.
      // This prevents the user from reaching Review Summary with an
      // incomplete scan and directly addresses TC_REG_03/TC_REG_04.
      if (!hasName || !hasAddress || !hasBarangay) {
        setIdScanCompleted(false);
        const missing = [
          !hasName ? "name" : "",
          !hasAddress ? "address" : "",
          !hasBarangay ? "barangay" : "",
        ].filter(Boolean);
        throw new Error(
          `The ID scan is incomplete. Please upload a clearer ID so the ${missing.join(", ")} can be extracted, then scan again.`
        );
      }

      setFormData((prev) => ({
        ...prev,
        ...(hasName ? { fullName: extracted.fullName.trim() } : {}),
        ...(hasAddress ? { address: extracted.address.trim() } : {}),
        ...(hasBarangay ? { barangay: extracted.barangay } : {}),
      }));
      setIdScanCompleted(true);
      setScanMessage(
        source === "gemini"
          ? "ID scan verified. Name, address, and barangay were extracted successfully."
          : "ID scan verified with offline OCR. Please double-check the extracted name, address, and barangay.",
      );
    } catch (error) {
      setIdScanCompleted(false);
      console.error("Government ID local OCR failed:", error);
      setScanMessage("Scan failed. You can enter your details manually.");
      alert(error?.message || "We couldn't read the ID. Please use a clearer image or enter the details manually.");
    } finally {
      setScanningId(false);
    }
  };

  const scanBusinessPermit = async () => {
    const file = permitRef.current?.files?.[0] || formData.businessPermit;
    if (!file) {
      alert("Please upload your business permit first.");
      return;
    }
    if (!OCR_IMAGE_TYPES.includes(file.type) && file.type !== "application/pdf") {
      alert("Please upload a PDF, JPEG, PNG, or WebP permit.");
      return;
    }
    if (file.size > OCR_MAX_FILE_SIZE) {
      alert("File size must not exceed 5MB.");
      return;
    }

    setScanningPermit(true);
    setPermitScanCompleted(false);
    setScanMessage("Scanning business permit…");

    try {
      const { extracted, source, readableTextFound } = await extractDocument({
        file,
        documentType: "business_permit",
        barangays: valenzuelaBarangays,
        onStatus: setScanMessage,
        localParser: parseBusinessPermitOcr,
        localOptions: { multiPass: true },
      });

      const hasUsefulFields = Object.entries(extracted).some(
        ([key, value]) =>
          key !== "_readableTextFound" && String(value || "").trim(),
      );

      if (!hasUsefulFields && !readableTextFound) {
        throw new Error(
          "We couldn't identify readable permit details. Please upload a clearer document and scan again.",
        );
      }

      setFormData((prev) => ({
        ...prev,
        ...(extracted.fullName?.trim()
          ? { fullName: extracted.fullName.trim() }
          : {}),
        ...(extracted.businessName?.trim()
          ? { businessName: extracted.businessName.trim() }
          : {}),
        ...(extracted.address?.trim()
          ? { address: extracted.address.trim() }
          : {}),
        ...(extracted.contactNumber?.trim()
          ? { contactNumber: extracted.contactNumber.trim() }
          : {}),
        ...(extracted.businessPermitNumber?.trim()
          ? { businessPermitNumber: extracted.businessPermitNumber.trim() }
          : {}),
        ...(extracted.permitType?.trim()
          ? { permitType: extracted.permitType.trim() }
          : {}),
        ...(extracted.permitIssuingLgu?.trim()
          ? { permitIssuingLgu: extracted.permitIssuingLgu.trim() }
          : {}),
        ...(extracted.permitIssueDate?.trim()
          ? { permitIssueDate: extracted.permitIssueDate.trim() }
          : {}),
        ...(extracted.permitExpiryDate?.trim()
          ? { permitExpiryDate: extracted.permitExpiryDate.trim() }
          : {}),
        ...(extracted.businessActivity?.trim()
          ? { businessActivity: extracted.businessActivity.trim() }
          : {}),
        ...(extracted.barangay ? { barangay: extracted.barangay } : {}),
      }));

      setPermitScanCompleted(true);
      setScanMessage(
        source === "gemini"
          ? "Business permit scan complete. Business name, shop address, and owner details were extracted where available."
          : "Business permit scan complete with offline OCR. Please review the extracted business name, shop address, and owner details.",
      );
    } catch (error) {
      setPermitScanCompleted(false);
      console.error("Business permit scan failed:", error);
      const friendly = await getScanErrorMessage(
        error,
        "We couldn't read the business permit. Please upload a clearer document and try again.",
      );
      setScanMessage(friendly);
      alert(friendly);
    } finally {
      setScanningPermit(false);
    }
  };

  const scanTechnicalCertificate = async () => {
    const file = techRef.current?.files?.[0] || formData.techCert;
    if (!file) {
      alert("Please upload your technical certification first.");
      return;
    }
    if (!OCR_IMAGE_TYPES.includes(file.type) && file.type !== "application/pdf") {
      alert("Please upload a PDF, JPEG, PNG, or WebP certificate.");
      return;
    }
    if (file.size > OCR_MAX_FILE_SIZE) {
      alert("File size must not exceed 5MB.");
      return;
    }

    setScanningTechCert(true);
    setTechCertScanCompleted(false);
    setScanMessage("Scanning technical certificate…");

    try {
      const { extracted, source, readableTextFound } = await extractDocument({
        file,
        documentType: "technical_certificate",
        barangays: valenzuelaBarangays,
        onStatus: setScanMessage,
        localParser: parseTechnicalCertificateOcr,
        localOptions: { multiPass: true },
      });

      const hasUsefulFields = Object.entries(extracted).some(
        ([key, value]) =>
          key !== "_readableTextFound" && String(value || "").trim(),
      );

      if (!hasUsefulFields && !readableTextFound) {
        throw new Error(
          "We couldn't identify readable certification details. Please upload a clearer document and scan again.",
        );
      }

      setFormData((prev) => ({
        ...prev,
        ...(extracted.fullName?.trim()
          ? { fullName: extracted.fullName.trim() }
          : {}),
        ...(extracted.businessName?.trim()
          ? { businessName: extracted.businessName.trim() }
          : {}),
        ...(extracted.address?.trim()
          ? { address: extracted.address.trim() }
          : {}),
        ...(extracted.certificateNumber?.trim()
          ? { techCertificateNumber: extracted.certificateNumber.trim() }
          : {}),
        ...(extracted.issuer?.trim()
          ? { techCertificateIssuer: extracted.issuer.trim() }
          : {}),
        ...(extracted.certificateTitle?.trim()
          ? { techCertificateTitle: extracted.certificateTitle.trim() }
          : {}),
        ...(extracted.issueDate?.trim()
          ? { techCertificateIssueDate: extracted.issueDate.trim() }
          : {}),
        ...(extracted.expiryDate?.trim()
          ? { techCertificateExpiryDate: extracted.expiryDate.trim() }
          : {}),
        ...(extracted.specialization?.trim()
          ? { techSpecialization: extracted.specialization.trim() }
          : {}),
        ...(extracted.barangay ? { barangay: extracted.barangay } : {}),
      }));

      setTechCertScanCompleted(true);
      setScanMessage(
        source === "gemini"
          ? "Technical certificate scan complete. Review the extracted certification and owner/shop details."
          : "Technical certificate scan complete with offline OCR. Please review the extracted details.",
      );
    } catch (error) {
      setTechCertScanCompleted(false);
      console.error("Technical certificate scan failed:", error);
      const friendly = await getScanErrorMessage(
        error,
        "We couldn't read the technical certificate. Please upload a clearer document and try again.",
      );
      setScanMessage(friendly);
      alert(friendly);
    } finally {
      setScanningTechCert(false);
    }
  };

  const validateStep2 = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const password = formData.password;
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
        newErrors.password =
          "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol.";
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getInitialShopLocation = () => {
    return (
      BARANGAY_COORDINATES[formData.barangay] ||
      VALENZUELA_CENTER
    );
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!accountType) {
        alert("Please select an account type.");
        return;
      }
      if (!privacyConsent) {
        alert("You must consent to data collection to proceed.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.email.trim() || !formData.password || !formData.confirmPassword) { alert("Please enter your email and password, then confirm your password."); return; }
      if (formData.password !== formData.confirmPassword) { alert("Passwords do not match."); return; }
      if (formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)) { alert("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol."); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          options: { data: { role: accountType, buyer_type: accountType, is_verified: false, status: "active", verification_badge: "New User" } }
        });
        if (error) throw error;
        if (!data?.user) throw new Error("Could not create the account.");
        setAuthUserId(data.user.id);
        setStep(3);
        alert("A verification code has been sent to your email. Check your inbox and spam folder.");
      } catch (err) {
        // Full technical detail stays in the console for debugging;
        // the user only ever sees the friendly translation.
        console.error("Signup error details:", err);
        alert(getFriendlyErrorMessage(err, "We couldn't create your account right now. Please try again in a moment."));
      } finally {
        setLoading(false);
      }
    }

    if (step === 3) {
      if (!/^\d{6}$/.test(otp.trim())) { alert("Enter the 6-digit code sent to your email."); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({ email: formData.email.trim().toLowerCase(), token: otp.trim(), type: "signup" });
        if (error) throw error;
        if (!data?.user?.id) throw new Error("Email verification could not be confirmed.");
        setEmailVerified(true);
        setAuthUserId(data.user.id);
        setStep(accountType === "repair_shop" ? 4 : 4);
        alert("Email verified! Please complete your account verification details.");
      } catch (err) {
        console.error("OTP verification error:", err);
        alert(getFriendlyErrorMessage(err, "We couldn't verify that code. Please try again."));
      }
      finally { setLoading(false); }
      return;
    }

    if (step === 4) {
      if (!formData.fullName.trim()) { alert("Please scan your ID or enter the name shown on it."); return; }
      if (!formData.contactNumber.trim()) { alert("Please enter your contact number after scanning your ID."); return; }
      if (!formData.barangay) { alert("Please confirm your barangay after scanning your ID."); return; }
      if (accountType === "harvester") {
        const idFile = governmentIdRef.current?.files?.[0] || formData.governmentId;
        if (!idFile) {
          alert("Please upload your personal government ID and scan it before continuing.");
          return;
        }
        if (!idScanCompleted) {
          alert("Please complete and verify the government ID scan before continuing.");
          return;
        }
        if (!formData.address.trim()) {
          alert("Please confirm or enter your address after the ID scan.");
          return;
        }
        if (!formData.fullName.trim() || !formData.barangay) {
          alert("Please review the extracted name, address, and barangay before continuing.");
          return;
        }
      }
      // =========================
      // REPAIR SHOP
      // =========================
      if (accountType === "repair_shop") {
        if (!formData.businessName.trim()) {
          alert("Please enter your Shop / Business Name.");
          return;
        }

        if (!formData.address.trim()) {
          alert("Please enter your shop address.");
          return;
        }

        if (!shopLocation) {
          alert("Please select your shop location on the map.");
          return;
        }

        if (!formData.businessPermit) {
          alert("Please upload your Business Permit / DTI Registration.");
          return;
        }

        if (!formData.certificationType) {
          alert("Please select a Certification Type.");
          return;
        }

        if (
          formData.certificationType === "Other Certification" &&
          !formData.otherCertification.trim()
        ) {
          alert("Please specify your certification.");
          return;
        }

        if (!formData.techCert) {
          alert("Please upload your Certification Document.");
          return;
        }

        if (!formData.businessPermitNumber.trim()) {
          alert("Please enter or confirm the Business Permit Number.");
          return;
        }
        if (!formData.permitType.trim()) {
          alert("Please enter or confirm the Permit Type.");
          return;
        }
        if (!formData.permitIssuingLgu.trim()) {
          alert("Please enter or confirm the Permit Issuing LGU.");
          return;
        }
        if (!formData.businessActivity.trim()) {
          alert("Please enter or confirm the Business Activity / Nature of Business.");
          return;
        }
        if (!formData.techCertificateNumber.trim()) {
          alert("Please enter or confirm the Technical Certificate Number.");
          return;
        }
        if (!formData.techCertificateIssuer.trim()) {
          alert("Please enter or confirm the Technical Certificate Issuer.");
          return;
        }
        if (!formData.techCertificateTitle.trim()) {
          alert("Please enter or confirm the Technical Certification Title.");
          return;
        }

        setRegistrationSummaryReady(true);
        setStep(5);
        return;
      }

      if (!idScanCompleted) {
        alert("Please scan your government ID successfully before continuing. If the ID is unreadable, upload a clear valid ID and try again.");
        return;
      }
      if (!formData.address.trim()) {
        alert("Please confirm or enter your address before continuing.");
        return;
      }

      setRegistrationSummaryReady(true);
      setStep(5);
      return;
    }

    if (step === 5) {
      if (!registrationSummaryReady) {
        alert("Please review your registration details before creating the account.");
        return;
      }
      await handleFinalSubmit();
      return;
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    try {
      // =========================
      // DETERMINE FINAL ROLE
      // =========================
      const finalRole = accountType;

      if (!emailVerified || !authUserId) throw new Error("Please verify your email before submitting registration.");
      const userId = authUserId;

      // =========================
      let updates = {
        full_name: formData.fullName,
        email: formData.email,
        contact_number: formData.contactNumber,
        barangay: formData.barangay,

        role: finalRole,

        business_name: formData.businessName || null,

        // Repair Shop location
        address: formData.address.trim() || null,

        latitude:
          finalRole === "repair_shop" && shopLocation
            ? shopLocation[0]
            : null,

        longitude:
          finalRole === "repair_shop" && shopLocation
            ? shopLocation[1]
            : null,

        verification_status: "pending",
        is_verified: false,
        status: "active",

        average_rating: 0,
        total_reviews: 0,

        certification_type:
          finalRole === "repair_shop"
            ? formData.certificationType
            : null,

        other_certification:
          finalRole === "repair_shop" &&
            formData.certificationType === "Other Certification"
            ? formData.otherCertification
            : null,

        business_permit_number:
          finalRole === "repair_shop" ? formData.businessPermitNumber.trim() || null : null,
        permit_type:
          finalRole === "repair_shop" ? formData.permitType.trim() || null : null,
        permit_issuing_lgu:
          finalRole === "repair_shop" ? formData.permitIssuingLgu.trim() || null : null,
        permit_issue_date:
          finalRole === "repair_shop" ? formData.permitIssueDate || null : null,
        permit_expiry_date:
          finalRole === "repair_shop" ? formData.permitExpiryDate || null : null,
        business_activity:
          finalRole === "repair_shop" ? formData.businessActivity.trim() || null : null,

        tech_certificate_number:
          finalRole === "repair_shop" ? formData.techCertificateNumber.trim() || null : null,
        tech_certificate_issuer:
          finalRole === "repair_shop" ? formData.techCertificateIssuer.trim() || null : null,
        tech_certificate_title:
          finalRole === "repair_shop" ? formData.techCertificateTitle.trim() || null : null,
        tech_certificate_issue_date:
          finalRole === "repair_shop" ? formData.techCertificateIssueDate || null : null,
        tech_certificate_expiry_date:
          finalRole === "repair_shop" ? formData.techCertificateExpiryDate || null : null,
        tech_specialization:
          finalRole === "repair_shop" ? formData.techSpecialization.trim() || null : null,
      };

      // PERSONAL GOVERNMENT ID — required for community users/harvesters only.
      if (finalRole === "harvester") {
        const file = governmentIdRef.current?.files?.[0] || formData.governmentId;
        if (!file) throw new Error("Please upload your personal government ID.");
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `government-ids/${userId}/id_${Date.now()}.${ext}`;
        const { error: idUploadError } = await supabase.storage.from("verifications").upload(path, file);
        if (idUploadError) throw idUploadError;
        const { data } = supabase.storage.from("verifications").getPublicUrl(path);
        updates.government_id_url = data.publicUrl;
      }

      // =========================
      // REPAIR SHOP FILES
      // =========================
      if (finalRole === "repair_shop") {
        // BUSINESS PERMIT
        if (formData.businessPermit) {
          const file = formData.businessPermit;

          const fileExt = file.name.split(".").pop();

          const fileName = `${userId}/permit_${Date.now()}.${fileExt}`;

          const { error } = await supabase.storage
            .from("verifications")
            .upload(`permits/${fileName}`, file);

          if (error) throw error;

          const { data } = supabase.storage
            .from("verifications")
            .getPublicUrl(`permits/${fileName}`);

          updates.business_permit_url = data.publicUrl;
        }

        // TECH CERT
        if (formData.techCert) {
          const file = formData.techCert;

          const fileExt = file.name.split(".").pop();

          const fileName = `${userId}/cert_${Date.now()}.${fileExt}`;

          const { error } = await supabase.storage
            .from("verifications")
            .upload(`certs/${fileName}`, file);

          if (error) throw error;

          const { data } = supabase.storage
            .from("verifications")
            .getPublicUrl(`certs/${fileName}`);

          updates.tech_cert_url = data.publicUrl;
        }
      }

      // =========================
      // UPDATE PROFILE TABLE
      // =========================
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (profileError) throw profileError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          role: finalRole,
          verification_badge: "New User",
          verification_status: "pending",
        },
      });
      if (metadataError) {
        console.warn("Could not update signup metadata:", metadataError);
      }

      // The registration is complete, but the user must authenticate normally
      // through the Login screen rather than being silently logged in after signup.
      await supabase.auth.signOut();

      setIsSubmitted(true);
      alert("Account created successfully. Your badge is New User while verification is pending. Please log in with your email and password.");
    } catch (err) {
      console.error("Final registration submit error:", err);
      alert(getFriendlyErrorMessage(err, "We couldn't finish creating your account. Please try again in a moment."));
    } finally {
      setLoading(false);
    }
  };
  const steps = [1, 2, 3, 4, 5];

  const governmentIdReady =
    accountType !== "harvester" ||
    (
      idScanCompleted &&
      Boolean(formData.fullName?.trim()) &&
      Boolean(formData.address?.trim()) &&
      Boolean(formData.barangay)
    );

  const canReviewSummary =
    !loading &&
    (accountType === "repair_shop" || governmentIdReady);

  const canCreateAccount =
    !loading &&
    registrationSummaryReady &&
    (accountType === "repair_shop" || governmentIdReady);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#1a4567] via-[#2d7a7f] to-[#6da43a] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="bg-gradient-to-r from-[#448b78] to-[#6da43a] p-6 text-white text-left flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a13 13 0 0 1-13 13L8.1 20H11Z" />
              <path d="M19 2c-3 1.5-6.5 4-8 10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">Join Wasteless</h2>
            <p className="text-[10px] opacity-90">Create your account</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-center mb-8 relative">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-gray-100 -z-0"></div>
            <div className="flex justify-between w-full px-4 relative z-10">
              {steps.map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= num
                    ? "bg-[#2d7a7f] text-white"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                >
                  {step > num || isSubmitted ? "✓" : num}
                </div>
              ))}
            </div>
          </div>

          {!isSubmitted && step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Select Account Type
              </h3>

              <button
                onClick={() => setAccountType("harvester")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${accountType === "harvester"
                  ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                  : "border-gray-100 text-gray-600 hover:border-gray-300"
                  }`}
              >
                Community User / Tech-Dealer
                <span className="block text-[12px] font-normal text-gray-400 mt-1">
                  Buy working items or sell unused/non-working electronics
                </span>
              </button>

              <button
                onClick={() => setAccountType("repair_shop")}
                className={`w-full py-4 px-6 border rounded-xl text-sm transition-all text-center ${accountType === "repair_shop"
                  ? "border-teal-500 bg-teal-50 text-teal-700 font-bold"
                  : "border-gray-100 text-gray-600 hover:border-gray-300"
                  }`}
              >
                Repair Shop
                <span className="block text-[12px] font-normal text-gray-400 mt-1">
                  Buy items for parts or request repair services
                </span>
              </button>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#2d7a7f]"
                />
                <span className="text-[12px] leading-relaxed text-gray-600">
                  I consent to the collection and processing of my registration and verification information for Wasteless account creation and verification.
                </span>
              </label>

              {!privacyConsent && accountType && (
                <p className="text-[12px] text-red-500 -mt-2">You must consent to data collection to proceed.</p>
              )}

              <button
                disabled={!accountType || !privacyConsent}
                onClick={handleContinue}
                className={`w-full mt-6 py-3 rounded-lg font-bold text-sm transition-all ${accountType && privacyConsent ? "bg-[#2d7a7f] text-white hover:opacity-90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                Continue
              </button>
            </div>
          )}

          {!isSubmitted && step === 2 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[15px] font-semibold text-gray-700 mb-1 block">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="juan.delacruz@example.com"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.email ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.email}
                  />
                  {errors.email && (
                    <p className="text-[12px] text-red-500 mt-1">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[15px] font-semibold text-gray-700 mb-1 block">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="........"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.password ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.password}
                  />
                  <p className="text-[12px] text-gray-400 mt-1.5">
                    Minimum 8 characters with uppercase, lowercase, number, and symbol
                  </p>
                </div>

                <div>
                  <label className="text-[15px] font-semibold text-gray-700 mb-1 block">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    placeholder="........"
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${errors.confirmPassword ? "border-red-500 ring-red-100" : "border-gray-200 focus:ring-teal-500/20 focus:border-teal-500"}`}
                    onChange={handleChange}
                    value={formData.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm hover:bg-[#246367] transition-all shadow-md"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {!isSubmitted && step === 3 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-lg font-bold text-gray-800">Verify your email</h3>
              <p className="text-sm text-gray-600">We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it below to continue.</p>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-xl tracking-widest" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 border rounded-xl text-sm">Back</button>
                <button type="button" onClick={handleContinue} disabled={loading || otp.length !== 6} className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm disabled:opacity-50">{loading ? "Verifying..." : "Verify code"}</button>
              </div>
              <button type="button" disabled={loading} onClick={async () => { setLoading(true); try { const { error } = await supabase.auth.resend({ type: "signup", email: formData.email.trim().toLowerCase() }); if (error) throw error; alert("A new verification code has been sent."); } catch (err) { console.error("Resend code error:", err); alert(getFriendlyErrorMessage(err, "We couldn't resend the code. Please try again shortly.")); } finally { setLoading(false); } }} className="w-full text-sm text-teal-700 font-semibold disabled:opacity-50">Resend code</button>
            </div>
          )}

          {!isSubmitted && step === 4 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-xs font-bold text-emerald-900 mb-1">
                Professional Verification
              </h3>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {accountType === "harvester"
                    ? "Upload your personal government ID so Wasteless can suggest your details. Review the information before continuing."
                    : "Provide your shop details, business registration, and technical certification. A personal government ID is not required for repair-shop registration."}
                </p>
              </div>

              {accountType === "harvester" && (
              <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
                <label className="text-[11px] font-bold text-gray-700 block">Personal Government ID <span className="text-red-500">*</span></label>
                {/* <input
                  type="file"
                  ref={governmentIdRef}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e, "governmentId")}
                  className="block w-full text-xs"
                /> */}
                
                <div
                      onClick={() => governmentIdRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.governmentId
                        ? "border-emerald-400 bg-emerald-50/10"
                        : "border-gray-200"
                        }`}
                      >
                      <input
                        type="file"
                        ref={governmentIdRef}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "governmentId")
                        }
                      />

                      <Upload
                        className={
                          formData.governmentId
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.governmentId
                          ? "ID uploaded!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.governmentId
                          ? formData.governmentId.name
                          : "PDF, JPEG, PNG, or WebP (max 5MB)"}
                      </span>
                    </div>
                    {formData.governmentId && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-white border border-teal-100 px-3 py-2">
                    <p className="text-xs text-emerald-700 font-semibold truncate">
                      Selected: {formData.governmentId.name}
                    </p>
                    {idScanCompleted && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide">
                        ✓ ID Verified
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={scanGovernmentId}
                  disabled={scanningId || !formData.governmentId}
                  className="w-full py-3 rounded-lg border-2 border-teal-600 text-teal-700 font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-50 transition"
                >
                  {scanningId ? "Scanning Government ID…" : idScanCompleted ? "Rescan Government ID" : "Scan ID and Auto-Fill"}
                </button>
                
                

                {idScanCompleted ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-black">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                          ID Scan Complete
                        </p>
                        <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed mt-1">
                          Scan complete. <strong>Review the extracted name, address, and barangay below before continuing.</strong>
                        </p>
                        <p className="text-[9px] text-emerald-700 mt-1.5">
                          The scan assists with registration data entry; it does not independently verify ID authenticity.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : scanMessage ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3"
                  >
                    <p className="text-[11px] font-bold text-amber-900">
                      ID scan needs attention
                    </p>
                    <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">
                      {scanMessage}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] text-amber-900 font-semibold">
                      Government ID scan required before Review Summary
                    </p>
                    <p className="text-[9px] text-amber-800 mt-1 leading-relaxed">
                      Upload a clear ID, scan it, then review the extracted name, address, and barangay. The Review Summary button stays disabled until the scan is complete.
                    </p>
                  </div>
                )}
              </div>
              )}
              {accountType === "repair_shop" && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Business Permit / DTI Registration{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => permitRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.businessPermit
                        ? "border-emerald-400 bg-emerald-50/10"
                        : "border-gray-200"
                        }`}
                      >
                      <input
                        type="file"
                        ref={permitRef}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "businessPermit")
                        }
                      />

                      <Upload
                        className={
                          formData.businessPermit
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.businessPermit
                          ? "Permit uploaded!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.businessPermit
                          ? formData.businessPermit.name
                          : "PDF, JPEG, PNG, or WebP (max 5MB)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={scanBusinessPermit}
                      disabled={scanningPermit || scanningTechCert || !formData.businessPermit}
                      className="w-full mt-3 py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold text-sm disabled:opacity-50"
                    >
                      {scanningPermit ? "Scanning permit…" : "Scan permit and autofill details"}
                    </button>
                    {permitScanCompleted ? (
                      <div role="status" aria-live="polite" className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-xs font-black text-emerald-900">✓ Business Permit Scan Complete</p>
                        <p className="text-[10px] text-emerald-800 mt-1 leading-relaxed">
                          Business name, shop address, and owner's name were extracted where available. Please review the fields below.
                        </p>
                      </div>
                    ) : scanMessage && !scanningPermit && (
                      <div role="alert" aria-live="polite" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[10px] font-semibold text-amber-900">{scanMessage}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">OCR assists with data entry. Review the extracted details; scanning does not verify permit authenticity.</p>
                  </div>

                  {/* CERTIFICATION TYPE */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Certification Type{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="certificationType"
                      value={formData.certificationType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">
                        Select certification type...
                      </option>

                      {certificationOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* OTHER CERTIFICATION */}
                  {formData.certificationType === "Other Certification" && (
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">
                        Specify Certification{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        name="otherCertification"
                        type="text"
                        placeholder="Enter certification name"
                        value={formData.otherCertification}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  )}

                  {/* TECHNICAL CERTIFICATION */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Technical Certification{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div
                      onClick={() => techRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer transition-colors ${formData.techCert
                        ? "border-emerald-400 bg-emerald-50/10"
                        : "border-gray-200"
                        }`}
                    >
                      <input
                        type="file"
                        ref={techRef}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) =>
                          handleFileChange(e, "techCert")
                        }
                      />

                      <Upload
                        className={
                          formData.techCert
                            ? "text-emerald-500 mb-2"
                            : "text-gray-400 mb-2"
                        }
                        size={24}
                      />

                      <span className="text-teal-600 font-semibold text-sm">
                        {formData.techCert
                          ? "Certification uploaded!"
                          : "Click to upload"}
                      </span>

                      <span className="text-gray-400 text-[10px] mt-1">
                        {formData.techCert
                          ? formData.techCert.name
                          : "PDF, JPEG, PNG, or WebP (max 5MB)"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={scanTechnicalCertificate}
                      disabled={scanningTechCert || scanningPermit || !formData.techCert}
                      className="w-full mt-3 py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold text-sm disabled:opacity-50"
                    >
                      {scanningTechCert ? "Scanning certificate…" : techCertScanCompleted ? "Rescan technical certificate" : "Scan certificate and autofill details"}
                    </button>
                    {techCertScanCompleted && (
                      <div role="status" aria-live="polite" className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-xs font-black text-emerald-900">✓ Technical Certificate Scan Complete</p>
                        <p className="text-[10px] text-emerald-800 mt-1 leading-relaxed">
                          Certification details and owner/shop details were extracted where available. Please review the fields below.
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">
                      OCR assists with data entry. Review the extracted details; scanning does not verify certificate authenticity.
                    </p>
                  </div>

                  <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                    <p className="text-xs font-semibold text-gray-700">Business Permit Details</p>
                    <p className="text-[10px] text-gray-500">Review the fields extracted from your business permit before submitting.</p>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Business Permit Number <span className="text-red-500">*</span></label>
                      <input name="businessPermitNumber" type="text" value={formData.businessPermitNumber} onChange={handleChange} placeholder="Permit number" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Permit Type <span className="text-red-500">*</span></label>
                      <input name="permitType" type="text" value={formData.permitType} onChange={handleChange} placeholder="e.g. Mayor's Permit / Business Permit" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Permit Issuing LGU <span className="text-red-500">*</span></label>
                      <input name="permitIssuingLgu" type="text" value={formData.permitIssuingLgu} onChange={handleChange} placeholder="e.g. City Government of Valenzuela" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Issue Date</label>
                        <input name="permitIssueDate" type="date" value={formData.permitIssueDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Expiry Date</label>
                        <input name="permitExpiryDate" type="date" value={formData.permitExpiryDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Business Activity / Nature of Business <span className="text-red-500">*</span></label>
                      <input name="businessActivity" type="text" value={formData.businessActivity} onChange={handleChange} placeholder="Nature of business" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                    <p className="text-xs font-semibold text-gray-700">Technical Certification Details</p>
                    <p className="text-[10px] text-gray-500">Review the fields extracted from your technical certificate before submitting.</p>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Certificate Number <span className="text-red-500">*</span></label>
                      <input name="techCertificateNumber" type="text" value={formData.techCertificateNumber} onChange={handleChange} placeholder="Certificate number" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Issuing Organization <span className="text-red-500">*</span></label>
                      <input name="techCertificateIssuer" type="text" value={formData.techCertificateIssuer} onChange={handleChange} placeholder="e.g. TESDA" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Certification / Qualification Title <span className="text-red-500">*</span></label>
                      <input name="techCertificateTitle" type="text" value={formData.techCertificateTitle} onChange={handleChange} placeholder="Certification or qualification title" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Issue Date</label>
                        <input name="techCertificateIssueDate" type="date" value={formData.techCertificateIssueDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-2">Expiry Date</label>
                        <input name="techCertificateExpiryDate" type="date" value={formData.techCertificateExpiryDate} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-2">Specialization / Competency</label>
                      <input name="techSpecialization" type="text" value={formData.techSpecialization} onChange={handleChange} placeholder="Specialization or competency" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                </>
              )}

              {/* DETAILS TO REVIEW / COMPLETE AFTER ID SCAN */}
              <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-700">Review your details</p>
                {/* REVIEW NAME EXTRACTED FROM ID */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-2">Full Name <span className="text-red-500">*</span></label>
                <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} placeholder={accountType === "repair_shop" ? "Full name of owner/contact person" : "Name as shown on your government ID"} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                {!formData.fullName.trim() && <p className="text-[10px] text-amber-700 mt-1">{accountType === "repair_shop" ? "Enter the full name shown on the business permit." : "Scan your ID first. If the name cannot be read, enter it exactly as shown on your ID."}</p>}
              </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-2">Address <span className="text-red-500">*</span></label>
                  <textarea name="address" rows={2} value={formData.address} onChange={handleChange} placeholder={accountType === "repair_shop" ? "Complete shop address" : "Address as shown on your government ID"} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none" />
                  <p className="text-[10px] text-gray-500 mt-1">Review or correct the address before creating your account.</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-2">Contact Number <span className="text-red-500">*</span></label>
                  <input name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} placeholder="09123456789" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm" />
                  <p className="text-[10px] text-gray-500 mt-1">{accountType === "repair_shop" ? "Review the contact number extracted from the business permit." : "Enter or correct your phone number if it was not extracted from the ID."}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-2">{accountType === "repair_shop" ? "Business Barangay" : "Barangay of Residence"} <span className="text-red-500">*</span></label>
                  <select name="barangay" value={formData.barangay} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Select barangay...</option>
                    {valenzuelaBarangays.map((brgy) => <option key={brgy} value={brgy}>{brgy}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">{accountType === "repair_shop" ? "Confirm the barangay where the repair shop is located." : "Confirm the barangay suggested by the ID scan."}</p>
                </div>
              </div>
              {/* =========================
        SELLER / HARVESTER
    ========================= */}
              {accountType === "harvester" && (
                <div className="space-y-6">

                  {/* ROLE DESCRIPTION */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      As a Community User / Tech-Dealer, you can buy working second-hand electronics and sell eligible electronics on Wasteless.
                    </p>
                  </div>
                </div>
              )}

              {/* =========================
        REPAIR SHOP
    ========================= */}
              {accountType === "repair_shop" && (
                <div className="space-y-6">

                  {/* BUSINESS NAME */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Business/Shop Name{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      name="businessName"
                      type="text"
                      placeholder="Enter your business name"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      onChange={handleChange}
                      value={formData.businessName || ""}
                    />
                  </div>

                  {/* SHOP ADDRESS */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Shop Address{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <textarea
                      name="address"
                      rows={3}
                      placeholder="Enter your complete shop address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />

                    <p className="text-[9px] text-gray-400 mt-1.5">
                      Enter the address of your actual repair shop location.
                    </p>
                  </div>

                  {/* =========================
    SHOP LOCATION
========================= */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-2">
                      Shop Location{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={16}
                          className="text-emerald-600 mt-0.5 shrink-0"
                        />

                        <p className="text-[10px] text-emerald-800 leading-relaxed">
                          Select the exact location of your repair shop.
                          Click on the map or drag the pin to position it
                          at your shop.
                        </p>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-gray-200">
                      <MapContainer
                        center={
                          shopLocation ||
                          getInitialShopLocation()
                        }
                        zoom={15}
                        scrollWheelZoom={true}
                        style={{
                          height: "300px",
                          width: "100%",
                        }}
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <LocationSelector
                          position={
                            shopLocation ||
                            getInitialShopLocation()
                          }
                          onChange={setShopLocation}
                        />
                      </MapContainer>
                    </div>

                    {shopLocation ? (
                      <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[9px] font-semibold text-gray-600">
                          Selected shop location
                        </p>

                        <p className="text-[9px] text-gray-400 mt-0.5">
                          Latitude: {shopLocation[0].toFixed(6)}
                          {" • "}
                          Longitude: {shopLocation[1].toFixed(6)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-gray-400 mt-1.5">
                        A starting location based on your selected barangay
                        will be shown. Please move the pin to your actual
                        shop location.
                      </p>
                    )}
                  </div>

                  
                </div>
              )}

              {/* =========================
        BUTTONS
    ========================= */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canReviewSummary}
                  title={
                    accountType === "harvester" && !governmentIdReady
                      ? "Complete and verify the government ID scan first."
                      : "Review Summary"
                  }
                  className="flex-1 py-2 bg-[#2d7a7f] text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Review Summary"}
                </button>
              </div>
            </div>
          )}


          {!isSubmitted && step === 5 && (
            <div className="space-y-4 animate-fadeIn text-left">
              <h3 className="text-lg font-bold text-gray-800">Registration Summary</h3>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                <p className="text-[11px] text-emerald-800 leading-relaxed">Review all information carefully. You can edit any field by going back before creating your account.</p>
              </div>

              {accountType === "harvester" && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">✓</div>
                    <div>
                      <p className="text-sm font-black text-emerald-900">Government ID Scan Verified</p>
                      <p className="text-[10px] text-emerald-800 mt-1 leading-relaxed">
                        The extracted <strong>name, address, and barangay</strong> are shown below. Please check them carefully before creating the account.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden text-sm">
                {[
                  ["Account Type", accountType === "harvester" ? "Community User / Tech-Dealer" : "Repair Shop"],
                  ["Email", formData.email],
                  ["Full Name", formData.fullName],
                  ["Address", formData.address],
                  ["Contact Number", formData.contactNumber],
                  [accountType === "repair_shop" ? "Business Barangay" : "Barangay of Residence", formData.barangay],
                  ...(accountType === "repair_shop" ? [
                    ["Business / Shop Name", formData.businessName],
                    ["Business Permit Number", formData.businessPermitNumber],
                    ["Permit Type", formData.permitType],
                    ["Permit Issuing LGU", formData.permitIssuingLgu],
                    ["Business Activity", formData.businessActivity],
                    ["Certification", formData.certificationType === "Other Certification" ? formData.otherCertification : formData.certificationType],
                    ["Certificate Number", formData.techCertificateNumber],
                    ["Certificate Issuer", formData.techCertificateIssuer],
                    ["Certificate Title", formData.techCertificateTitle],
                  ] : []),
                ].map(([label, value]) => {
                  const highlighted =
                    accountType === "harvester" &&
                    ["Full Name", "Address", "Barangay of Residence"].includes(label);

                  return (
                    <div
                      key={label}
                      className={`p-3 flex flex-col gap-1 ${
                        highlighted ? "bg-emerald-50/70 border-l-4 border-emerald-400" : ""
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${highlighted ? "text-emerald-700" : "text-gray-400"}`}>
                        {label}
                        {highlighted && " • EXTRACTED FROM ID"}
                      </span>
                      <span className={`break-words ${highlighted ? "text-emerald-900 font-bold" : "text-gray-800"}`}>
                        {value || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-700">Verification status</p>
                <p className="text-[11px] text-gray-600">New User - verification pending. Your role privileges are applied after account creation, while document verification remains pending.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50">Back / Edit</button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canCreateAccount}
                  title={
                    accountType === "harvester" && !governmentIdReady
                      ? "Complete and verify the government ID scan first."
                      : "Create Account"
                  }
                  className="flex-1 py-3 bg-[#2d7a7f] text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}

          {isSubmitted && (
            <div className="space-y-4 animate-fadeIn text-center">
              <h3 className="text-lg font-bold text-gray-800">Registration complete</h3>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                <p className="text-sm text-emerald-800 leading-relaxed">
                  Your registration details and documents were submitted. You can now log in. Your account is active, but verification is still pending. An administrator will review your submitted documents before your account is marked as verified.
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 mt-6">
            Already have an account?{" "}
            <span
              onClick={onLoginClick}
              className="text-teal-600 font-bold cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;