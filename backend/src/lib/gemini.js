// Google Gemini calls over the plain REST API (no SDK — each is a single JSON
// POST): (1) vision — read a Turkish document (vehicle registration / driving
// licence / company stamp) photo into structured fields; (2) image generation —
// produce a studio catalog photo of a vehicle from its make/model/colour.
const prisma = require("./prisma");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-3.6-flash has a tiny free-tier daily cap (20 requests) that a busy
// office blows through; gemini-3.7-flash has the normal free quota and answers
// reliably (occasional 503s under load are retried below). Override with
// GEMINI_VISION_MODEL without a redeploy if a better model appears.
const MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.7-flash";
const ENDPOINT = `${API_BASE}/${MODEL}:generateContent`;

// Image generation ("Nano Banana") has NO free-tier quota — the project behind
// GEMINI_API_KEY must have billing enabled or the call returns HTTP 429.
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

const REGISTRATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    documentDetected: {
      type: "BOOLEAN",
      description: "Görselde gerçekten bir Türkiye motorlu taşıt tescil belgesi (ruhsat) görülüyor mu?",
    },
    brand: { type: "STRING", nullable: true, description: "Araç markası (örn. FIAT, RENAULT)" },
    model: { type: "STRING", nullable: true, description: "Araç tipi / ticari adı (örn. DOBLO, CLIO)" },
    licensePlate: { type: "STRING", nullable: true, description: "Plaka, boşluksuz ve büyük harf (örn. 35ABC123)" },
    modelYear: { type: "INTEGER", nullable: true, description: "Model yılı" },
    chassisNo: { type: "STRING", nullable: true, description: "Şasi No" },
    engineNo: { type: "STRING", nullable: true, description: "Motor No" },
    color: { type: "STRING", nullable: true, description: "Renk" },
    fuelType: {
      type: "STRING",
      nullable: true,
      enum: ["Diesel", "Gasoline", "Hybrid", "Electricity", "LPG", "CNG", "Hydrogen"],
      description: "Yakıt cinsi",
    },
    registrationSerialNo: { type: "STRING", nullable: true, description: "Tescil Belgesi Seri No" },
    registrationDate: {
      type: "STRING",
      nullable: true,
      description: "Tescil / ilk tescil tarihi, YYYY-MM-DD formatında",
    },
  },
  required: ["documentDetected"],
};

const PROMPT = `Bu görüntü bir Türkiye Motorlu Taşıt Tescil Belgesi (ruhsat) mi incele.
Kurallar:
- Görsel bir ruhsat değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve
  TÜM diğer alanları null bırak. Asla tahmin etme veya uydurma.
- Görsel bir ruhsatsa documentDetected=true yap; yalnızca görselde NET biçimde okuduğun alanları
  doldur, göremediğin/belgede bulunmayan bir alanı null bırak.
- licensePlate: boşluksuz, büyük harf (örn. "35ABC123").
- fuelType: yalnızca şu değerlerden biri olmalı — Diesel (Dizel), Gasoline (Benzin), Hybrid (Hibrit),
  Electricity (Elektrik), LPG, CNG, Hydrogen (Hidrojen).
- registrationDate: YYYY-MM-DD formatında.
- modelYear: yalnızca 4 haneli yıl sayısı.`;

// Google doesn't publish a free-tier daily cap for this model any more (and
// never guaranteed one even when it did) — third-party numbers found for it
// were inconsistent and partly about older models, so guessing a number here
// would just be a different kind of wrong. Instead of asserting a limit we
// don't actually know, this only ever reports facts: how many vision calls
// have actually gone out today, and — once Google's own 429 has genuinely
// been hit — the exact count that happened at (see recordVisionExhausted).
const VISION_USAGE_ID = "vision";

// Google's free-tier quota resets at midnight Pacific Time, not local/UTC
// midnight — the counter has to key off the same calendar day Google does or
// it drifts hours off the real reset every day.
const pacificDay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());

// Bumps today's (Pacific) vision-call count by one, rolling over to a fresh
// day when it's turned. Best-effort — a failure here must never block the
// actual Gemini call, so callers swallow its errors.
const recordVisionUsage = async () => {
  const day = pacificDay();
  const existing = await prisma.aiUsageCounter.findUnique({ where: { id: VISION_USAGE_ID } });
  if (existing && existing.day === day) {
    await prisma.aiUsageCounter.update({ where: { id: VISION_USAGE_ID }, data: { count: { increment: 1 } } });
  } else {
    await prisma.aiUsageCounter.upsert({
      where: { id: VISION_USAGE_ID },
      create: { id: VISION_USAGE_ID, day, count: 1 },
      update: { day, count: 1 },
    });
  }
};

// First time today's calls actually hit Google's real 429, stamp the count
// it happened at — the one number about the quota we can ever be sure of,
// since we saw Google enforce it ourselves. Only the first hit of the day is
// kept (an idle afternoon after the reset shouldn't overwrite the morning's
// real reading with a stale one).
const recordVisionExhausted = async () => {
  const day = pacificDay();
  const row = await prisma.aiUsageCounter.findUnique({ where: { id: VISION_USAGE_ID } });
  if (!row || row.day !== day || row.exhaustedAt != null) return;
  await prisma.aiUsageCounter.update({ where: { id: VISION_USAGE_ID }, data: { exhaustedAt: row.count } });
};

// Today's usage snapshot for the admin UI. Never throws — an unreadable
// counter just reads as "no data yet" instead of breaking the scan buttons.
const getVisionUsage = async () => {
  const day = pacificDay();
  let row;
  try {
    row = await prisma.aiUsageCounter.findUnique({ where: { id: VISION_USAGE_ID } });
  } catch {
    row = null;
  }
  const fresh = row && row.day === day;
  return { day, count: fresh ? row.count : 0, exhaustedAt: fresh ? row.exhaustedAt : null };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// gemini-flash routinely answers 503 ("high demand — usually temporary") or
// 429 under load, so a couple of quick retries turn most of those into a
// success — but Vercel kills this function at a hard wall-clock cap, and a
// bare fetch() has NO timeout of its own: under that same load a call can
// hang well past the cap with the platform silently dropping the connection
// and the admin's upload spinner never resolving ("nothing happens" — not an
// error, just no response at all). Budget the whole call (every attempt +
// backoff) so it always finishes — success or a real thrown error — with
// enough of the cap left to actually answer the client.
const TOTAL_BUDGET_MS = 8000;
const PER_ATTEMPT_TIMEOUT_MS = 6000;

// One vision call: a document photo + a prompt + a response schema -> the
// parsed JSON object.
const geminiVisionJson = async (buffer, mimeType, prompt, schema) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil.");

  recordVisionUsage().catch(() => {});

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: AbortSignal.timeout(Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining)),
      });
    } catch {
      // Network error, or the attempt itself hit its own timeout — treat it
      // like a retryable failure rather than propagating, same as a 503.
      response = null;
    }
    if (response && (response.ok || (response.status !== 503 && response.status !== 429))) break;
    const backoff = 700 * (attempt + 1);
    const left = deadline - Date.now();
    if (attempt < 2 && left > 0) await sleep(Math.min(backoff, left));
  }

  if (!response) {
    const err = new Error("Yapay zeka servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.");
    err.code = "AI_TIMEOUT";
    throw err;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    // The free tier allows only ~20 vision requests per day per model. When that
    // runs out every call 429s until the daily reset — flag it so the operator
    // gets a "come back tomorrow / enable billing" message, not "try again".
    if (response.status === 429) {
      recordVisionExhausted().catch(() => {});
      const err = new Error(
        "Yapay zeka görsel okuma kotası (günlük ücretsiz sınır) doldu. Yarın tekrar deneyin ya da API anahtarının projesinde faturalandırmayı açın."
      );
      err.code = "AI_QUOTA";
      throw err;
    }
    throw new Error(`Gemini API hatası (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API'den beklenmeyen yanıt.");
  return JSON.parse(text);
};

const extractVehicleRegistration = (buffer, mimeType) =>
  geminiVisionJson(buffer, mimeType, PROMPT, REGISTRATION_SCHEMA);

// --- Customer documents: driving licence (individual) / company stamp or tax
// registration (corporate) -> the customer-form prefill payload. -----------------

const INDIVIDUAL_DOC_SCHEMA = {
  type: "OBJECT",
  properties: {
    documentDetected: {
      type: "BOOLEAN",
      description:
        "Görselde gerçekten bir Türkiye sürücü belgesi (ehliyet) veya T.C. kimlik kartı / nüfus cüzdanı görülüyor mu?",
    },
    firstName: { type: "STRING", nullable: true, description: "Adı (verilen ad)" },
    lastName: { type: "STRING", nullable: true, description: "Soyadı" },
    nationalId: { type: "STRING", nullable: true, description: "T.C. Kimlik No — tam 11 rakam" },
  },
  required: ["documentDetected"],
};

const INDIVIDUAL_DOC_PROMPT = `Bu görüntü bir Türkiye sürücü belgesi (ehliyet) ya da T.C. kimlik kartı / nüfus cüzdanı mı incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- Sürücü belgesinde alanlar numaralıdır: 1=Soyadı, 2=Adı, 4d=T.C. Kimlik No. Kimlik kartında "Soyadı/Surname", "Adı/Given Name(s)", "T.C. Kimlik No / TR Identity No".
- firstName/lastName: Türkçe, belgede yazıldığı gibi (BÜYÜK HARF olabilir, olduğu gibi bırak).
- nationalId: yalnızca 11 rakam, boşluksuz.`;

const CORPORATE_DOC_SCHEMA = {
  type: "OBJECT",
  properties: {
    documentDetected: {
      type: "BOOLEAN",
      description: "Görselde bir şirket kaşesi, vergi levhası veya antetli/imza sirküleri belgesi görülüyor mu?",
    },
    companyTitle: { type: "STRING", nullable: true, description: "Şirketin tam ticari unvanı (örn. ... LTD. ŞTİ. / A.Ş.)" },
    nationalId: { type: "STRING", nullable: true, description: "Vergi Kimlik No (VKN) — 10 rakam; yoksa 11 haneli T.C. No" },
    taxOffice: { type: "STRING", nullable: true, description: "Vergi Dairesi adı" },
    address: { type: "STRING", nullable: true, description: "Açık adres — il ve ilçe HARİÇ sokak/mahalle/no kısmı" },
    city: { type: "STRING", nullable: true, description: "İl, Türkçe ve düzgün büyük/küçük harf (örn. İzmir)" },
    district: { type: "STRING", nullable: true, description: "İlçe, Türkçe ve düzgün büyük/küçük harf (örn. Konak)" },
    phoneNumber: { type: "STRING", nullable: true, description: "Telefon numarası, yalnızca rakamlar" },
  },
  required: ["documentDetected"],
};

const CORPORATE_DOC_PROMPT = `Bu görüntü bir şirket kaşesi, vergi levhası veya antetli kağıt / imza sirküleri mi incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- companyTitle: unvanın tamamı, "LTD. ŞTİ." / "A.Ş." gibi ekler dahil.
- nationalId: Vergi No / VKN varsa onu yaz (10 rakam), yoksa T.C. Kimlik No (11 rakam). Yalnızca rakamlar.
- address: yalnızca sokak / mahalle / bina no kısmı; il ve ilçeyi ayrı alanlara yaz.
- city / district: Türkçe, düzgün yazımla (İzmir, Konak). İlçe belli değilse null bırak.`;

const extractCustomerDocument = (buffer, mimeType, kind) =>
  kind === "corporate"
    ? geminiVisionJson(buffer, mimeType, CORPORATE_DOC_PROMPT, CORPORATE_DOC_SCHEMA)
    : geminiVisionJson(buffer, mimeType, INDIVIDUAL_DOC_PROMPT, INDIVIDUAL_DOC_SCHEMA);

const IMAGE_PROMPT = ({ brand, model, modelYear, color }) => {
  const subject = [modelYear, color, brand, model].filter(Boolean).join(" ").trim();
  return `Profesyonel bir araç kataloğu için stüdyo fotoğrafı üret: ${subject}.
Kurallar:
- Yatay (manzara) kadraj, aracın tamamı görünür, ön-yan üç çeyrek (3/4) açı.
- Düz, dikişsiz beyaz stüdyo arka planı; yumuşak ve eşit aydınlatma; hafif zemin yansıması.
- Fotogerçekçi, keskin odak, yüksek çözünürlük.
- Görselde hiçbir yazı, logo damgası, filigran (watermark) veya plaka metni OLMASIN.
- Verilen marka/modelin gerçek kasa tipine ve oranlarına sadık kal.`;
};

// Text→image: returns the raw image bytes (base64 + mime) for the given vehicle.
// HTTP 429 → billing not enabled on the key's project; surfaced with a code so
// the caller can show a specific message.
const generateVehicleImage = async ({ brand, model, modelYear, color }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil.");

  const response = await fetch(`${API_BASE}/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: IMAGE_PROMPT({ brand, model, modelYear, color }) }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 429) {
      const err = new Error(
        "Gemini görsel üretimi kotası aşıldı — API anahtarının bağlı olduğu projede faturalandırma açık olmalı."
      );
      err.code = "AI_IMAGE_QUOTA";
      throw err;
    }
    throw new Error(`Gemini API hatası (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const inline = parts.map((p) => p.inlineData || p.inline_data).find((d) => d && d.data);
  if (!inline) {
    const blocked = data.promptFeedback?.blockReason;
    throw new Error(blocked ? `Gemini görsel üretmedi (${blocked}).` : "Gemini API görsel döndürmedi.");
  }
  return { base64: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
};

module.exports = { extractVehicleRegistration, extractCustomerDocument, generateVehicleImage, getVisionUsage };
