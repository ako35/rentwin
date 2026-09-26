// Claude (Anthropic) vision calls for document extraction: read a Turkish
// document (vehicle registration / driving licence / company stamp / traffic
// insurance policy) photo into structured fields. Image generation for the
// vehicle catalog photo stays on Gemini — see lib/gemini.js.
const Anthropic = require("@anthropic-ai/sdk");
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { z } = require("zod");
const prisma = require("./prisma");

// Override with CLAUDE_VISION_MODEL without a redeploy if a better/cheaper
// model is needed later.
const MODEL = process.env.CLAUDE_VISION_MODEL || "claude-haiku-4-5";

let client = null;
const getClient = () => {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY tanımlı değil.");
  client = new Anthropic({ apiKey });
  return client;
};

const REGISTRATION_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe("Görselde gerçekten bir Türkiye motorlu taşıt tescil belgesi (ruhsat) görülüyor mu?"),
  brand: z.string().nullable().describe("Araç markası (örn. FIAT, RENAULT)"),
  model: z.string().nullable().describe("Araç tipi / ticari adı (örn. DOBLO, CLIO)"),
  licensePlate: z.string().nullable().describe("Plaka, boşluksuz ve büyük harf (örn. 35ABC123)"),
  modelYear: z.number().int().nullable().describe("Model yılı"),
  chassisNo: z.string().nullable().describe("Şasi No"),
  engineNo: z.string().nullable().describe("Motor No"),
  color: z.string().nullable().describe("Renk"),
  fuelType: z
    .enum(["Diesel", "Gasoline", "Hybrid", "Electricity", "LPG", "CNG", "Hydrogen"])
    .nullable()
    .describe("Yakıt cinsi"),
  registrationSerialNo: z.string().nullable().describe("Tescil Belgesi Seri No"),
  registrationDate: z.string().nullable().describe("Tescil / ilk tescil tarihi, YYYY-MM-DD formatında"),
});

const REGISTRATION_PROMPT = `Bu görüntü bir Türkiye Motorlu Taşıt Tescil Belgesi (ruhsat) mi incele.
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

const INDIVIDUAL_DOC_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe(
      "Görselde gerçekten bir Türkiye sürücü belgesi (ehliyet), T.C. kimlik kartı / nüfus cüzdanı, ya da yabancı uyruklu bir müşterinin pasaportu görülüyor mu?"
    ),
  firstName: z.string().nullable().describe("Adı (verilen ad)"),
  lastName: z.string().nullable().describe("Soyadı"),
  nationalId: z
    .string()
    .nullable()
    .describe("T.C. Kimlik No (tam 11 rakam) — belge bir pasaportsa bunun yerine pasaport numarası (harf+rakam)."),
});

const INDIVIDUAL_DOC_PROMPT = `Bu görüntü bir Türkiye sürücü belgesi (ehliyet), T.C. kimlik kartı / nüfus cüzdanı, ya da yabancı uyruklu bir müşterinin pasaportu mu incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- Sürücü belgesinde alanlar numaralıdır: 1=Soyadı, 2=Adı, 4d=T.C. Kimlik No. Kimlik kartında "Soyadı/Surname", "Adı/Given Name(s)", "T.C. Kimlik No / TR Identity No".
- Pasaportta (herhangi bir ülke): alt kısımdaki MRZ (makine okunabilir bölge) ve üst bölümdeki "Surname/Soyadı", "Given Names/Adı", "Passport No/Pasaport No" alanlarını kullan.
- firstName/lastName: belgede yazıldığı gibi (BÜYÜK HARF olabilir, olduğu gibi bırak; pasaportta Latin harfleriyle yazılmış haliyle bırak).
- nationalId: T.C. kimlik kartı/ehliyetse yalnızca 11 rakam, boşluksuz. Pasaportsa pasaport numarasını olduğu gibi (harf+rakam, boşluksuz) yaz.`;

const CORPORATE_DOC_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe("Görselde bir şirket kaşesi, vergi levhası veya antetli/imza sirküleri belgesi görülüyor mu?"),
  companyTitle: z.string().nullable().describe('Şirketin tam ticari unvanı (örn. ... LTD. ŞTİ. / A.Ş.)'),
  nationalId: z.string().nullable().describe("Vergi Kimlik No (VKN) — 10 rakam; yoksa 11 haneli T.C. No"),
  taxOffice: z.string().nullable().describe("Vergi Dairesi adı"),
  address: z.string().nullable().describe("Açık adres — il ve ilçe HARİÇ sokak/mahalle/no kısmı"),
  city: z.string().nullable().describe("İl, Türkçe ve düzgün büyük/küçük harf (örn. İzmir)"),
  district: z.string().nullable().describe("İlçe, Türkçe ve düzgün büyük/küçük harf (örn. Konak)"),
  phoneNumber: z.string().nullable().describe("Telefon numarası, yalnızca rakamlar"),
});

const CORPORATE_DOC_PROMPT = `Bu görüntü bir şirket kaşesi, vergi levhası veya antetli kağıt / imza sirküleri mi incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- companyTitle: unvanın tamamı, "LTD. ŞTİ." / "A.Ş." gibi ekler dahil.
- nationalId: Vergi No / VKN varsa onu yaz (10 rakam), yoksa T.C. Kimlik No (11 rakam). Yalnızca rakamlar.
- address: yalnızca sokak / mahalle / bina no kısmı; il ve ilçeyi ayrı alanlara yaz.
- city / district: Türkçe, düzgün yazımla (İzmir, Konak). İlçe belli değilse null bırak.`;

const INSURANCE_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe("Görselde gerçekten bir Türkiye trafik sigortası veya kasko poliçesi görülüyor mu?"),
  type: z
    .enum(["Traffic", "Kasko"])
    .nullable()
    .describe("Poliçe türü — Zorunlu Trafik Sigortası ise Traffic, Kasko ise Kasko."),
  company: z.string().nullable().describe("Sigorta şirketinin ticari adı (örn. Anadolu Sigorta)"),
  policyNo: z.string().nullable().describe("Poliçe numarası"),
  startDate: z.string().nullable().describe("Poliçe başlangıç / tanzim tarihi, YYYY-MM-DD"),
  endDate: z.string().nullable().describe("Poliçe bitiş / vade sonu tarihi, YYYY-MM-DD"),
  premium: z.number().nullable().describe("Poliçe brüt prim tutarı (TL), yalnızca sayı"),
});

const INSURANCE_PROMPT = `Bu görüntü bir Türkiye trafik sigortası (zorunlu mali sorumluluk) ya da kasko poliçesi mi incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- type: belge "Trafik Sigortası" / "Zorunlu Mali Sorumluluk Sigortası" ise Traffic; "Kasko" ise Kasko.
- company: sigorta şirketinin ticari adı, ekler olmadan (örn. "Anadolu Sigorta", "Allianz", "Ak Sigorta").
- policyNo: poliçe numarası, olduğu gibi.
- startDate/endDate: YYYY-MM-DD formatında — "Başlangıç/Bitiş", "Tanzim/Vade Sonu" gibi alanlardan.
- premium: brüt prim / poliçe toplam tutarı — yalnızca sayı, TL sembolü ve binlik ayırıcı olmadan (örn. 4520.50).`;

// --- Usage counter (admin UI badge) --------------------------------------

const VISION_USAGE_ID = "vision";

// Keyed off the Türkiye calendar day so "bugün" in the admin UI matches the
// operator's own day, not an arbitrary UTC/Pacific reset.
const istanbulDay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

// Bumps today's vision-call count by one, rolling over on a new day.
// Best-effort — a failure here must never block the actual API call.
const recordVisionUsage = async () => {
  const day = istanbulDay();
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

// First time today's calls actually hit a rate limit, stamp the count it
// happened at. Only the first hit of the day is kept.
const recordVisionExhausted = async () => {
  const day = istanbulDay();
  const row = await prisma.aiUsageCounter.findUnique({ where: { id: VISION_USAGE_ID } });
  if (!row || row.day !== day || row.exhaustedAt != null) return;
  await prisma.aiUsageCounter.update({ where: { id: VISION_USAGE_ID }, data: { exhaustedAt: row.count } });
};

// Today's usage snapshot for the admin UI. Never throws.
const getVisionUsage = async () => {
  const day = istanbulDay();
  let row;
  try {
    row = await prisma.aiUsageCounter.findUnique({ where: { id: VISION_USAGE_ID } });
  } catch {
    row = null;
  }
  const fresh = row && row.day === day;
  return { day, count: fresh ? row.count : 0, exhaustedAt: fresh ? row.exhaustedAt : null };
};

// One vision call: a document photo + a prompt + a Zod schema -> the parsed,
// schema-validated object. The SDK already retries 429/5xx with backoff
// (max_retries default 2), so no hand-rolled retry loop is needed here.
const claudeVisionJson = async (buffer, mimeType, prompt, schema) => {
  recordVisionUsage().catch(() => {});

  let response;
  try {
    response = await getClient().beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: buffer.toString("base64") } },
              { type: "text", text: prompt },
            ],
          },
        ],
        output_format: betaZodOutputFormat(schema),
      },
      { timeout: 15000 }
    );
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      recordVisionExhausted().catch(() => {});
      const e = new Error(
        "Yapay zeka görsel okuma hız sınırına takıldı. Birkaç dakika sonra tekrar deneyin."
      );
      e.code = "AI_QUOTA";
      throw e;
    }
    if (err instanceof Anthropic.APIConnectionError) {
      const e = new Error("Yapay zeka servisi zamanında yanıt vermedi. Lütfen tekrar deneyin.");
      e.code = "AI_TIMEOUT";
      throw e;
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Claude API hatası (${err.status}): ${err.message}`);
    }
    throw err;
  }

  if (!response.parsed_output) throw new Error("Claude API'den beklenmeyen yanıt.");
  return response.parsed_output;
};

const extractVehicleRegistration = (buffer, mimeType) =>
  claudeVisionJson(buffer, mimeType, REGISTRATION_PROMPT, REGISTRATION_SCHEMA);

const extractCustomerDocument = (buffer, mimeType, kind) =>
  kind === "corporate"
    ? claudeVisionJson(buffer, mimeType, CORPORATE_DOC_PROMPT, CORPORATE_DOC_SCHEMA)
    : claudeVisionJson(buffer, mimeType, INDIVIDUAL_DOC_PROMPT, INDIVIDUAL_DOC_SCHEMA);

const extractVehicleInsurance = (buffer, mimeType) =>
  claudeVisionJson(buffer, mimeType, INSURANCE_PROMPT, INSURANCE_SCHEMA);

module.exports = {
  extractVehicleRegistration,
  extractCustomerDocument,
  extractVehicleInsurance,
  getVisionUsage,
};
