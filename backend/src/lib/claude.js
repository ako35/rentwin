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
// 2026-10-17: was claude-haiku-4-5 — admin reported frequent wrong/missing
// fields on dense official documents (vergi levhası, kimlik), consistent
// with the several ad/soyad- and TC-no-field prompt patches already made
// (see git log) — a capability ceiling on Haiku's cheapest vision tier, not
// a prompt problem. Sonnet reads small, cluttered print far more reliably;
// this is an admin-only tool at low volume, so the per-call cost increase
// is negligible next to getting correct data.
const MODEL = process.env.CLAUDE_VISION_MODEL || "claude-sonnet-5-5";

let client = null;
const getClient = () => {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error = new Error("ANTHROPIC_API_KEY tanımlı değil.");
    error.code = "AI_CONFIG";
    throw error;
  }
  // The SDK's own default (2) means a slow/overloaded call can retry twice,
  // each with its own fresh 15s timeout below — worst case ~45-50s of
  // wall-clock time for one admin click. Vercel's serverless function this
  // runs in has a duration cap (10s on Hobby, 15s by default on Pro unless
  // raised in vercel.json) that's likely shorter than that, so a retried
  // call risks being killed by the platform before ever reaching claude.js's
  // own error handling — the admin then sees a bare network failure instead
  // of a useful message. One retry keeps some resilience to a single
  // transient blip without compounding the timeout this badly.
  client = new Anthropic({ apiKey, maxRetries: 1 });
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
  lastName: z
    .string()
    .nullable()
    .describe("Soyadı — ehliyette '1' numaralı alan, kimlik kartında üstteki ad satırı. Adı ile KARIŞTIRMA."),
  firstName: z
    .string()
    .nullable()
    .describe("Adı (verilen ad) — ehliyette '2' numaralı alan, Soyadı'nın hemen ALTINDA yazar. Soyadı ile KARIŞTIRMA."),
  nationalId: z
    .string()
    .nullable()
    .describe(
      "T.C. Kimlik No, tam 11 rakam. Ehliyette bu, '4d' olarak numaralanmış alandır — '5' numaralı alan (Sürücü Belgesi Seri No, kısa) DEĞİLDİR. Belge bir pasaportsa bunun yerine pasaport numarası (harf+rakam)."
    ),
  birthDate: z.string().nullable().describe("Doğum tarihi, YYYY-MM-DD formatında."),
});

const INDIVIDUAL_DOC_PROMPT = `Bu görüntü bir Türkiye sürücü belgesi (ehliyet), T.C. kimlik kartı / nüfus cüzdanı, ya da yabancı uyruklu bir müşterinin pasaportu mu incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- Sürücü belgesinde (ehliyet) numaralı alanlar şöyledir: 1=Soyadı, 2=Adı, 3=Doğum Tarihi ve Yeri, 4a=Düzenlenme Tarihi, 4b=Geçerlilik Tarihi, 4c=Düzenleyen Makam, 4d=Belge No, 5=Sürücü Belgesi Seri No, 9=Sürücü Sınıfları (B, A2 gibi kısaltmalar).
- ÖNEMLİ — ehliyette "1" numaralı alan (Soyadı) her zaman ÜSTTE, "2" numaralı alan (Adı) onun hemen ALTINDA yazar. Bu iki alanı ASLA ters yazma: üstteki satır lastName'e, alttaki satır firstName'e gider. Kimlik kartında da aynı sıra geçerlidir ("Soyadı/Surname" alanı "Adı/Given Name(s)" alanından önce/üstte gelir).
- ÖNEMLİ — ehliyette T.C. Kimlik No, "4d" olarak numaralanmış, TAM 11 RAKAMdan oluşan alandır (genelde "4c" satırının hemen altında/yanında, sağ tarafta yer alır). "5" numaralı alan (Sürücü Belgesi Seri No) T.C. Kimlik No DEĞİLDİR ve genelde çok daha kısadır (5-6 rakam) — nationalId için ASLA "5" numaralı alanı kullanma, yalnızca tam 11 rakam olan "4d" alanını kullan. "4d" net okunamıyorsa veya 11 rakam değilse nationalId'yi null bırak, "5" alanını yedek olarak kullanma.
- Kimlik kartında "Soyadı/Surname", "Adı/Given Name(s)", "Doğum Tarihi/Date of Birth", "T.C. Kimlik No / TR Identity No" etiketli alanları kullan.
- Pasaportta (herhangi bir ülke): alt kısımdaki MRZ (makine okunabilir bölge) ve üst bölümdeki "Surname/Soyadı", "Given Names/Adı", "Date of Birth/Doğum Tarihi", "Passport No/Pasaport No" alanlarını kullan.
- firstName/lastName: belgede yazıldığı gibi (BÜYÜK HARF olabilir, olduğu gibi bırak; pasaportta Latin harfleriyle yazılmış haliyle bırak).
- nationalId: T.C. kimlik kartı/ehliyetse yalnızca 11 rakam, boşluksuz — 11 rakamdan az/fazla bir şeyi asla nationalId olarak yazma. Pasaportsa pasaport numarasını olduğu gibi (harf+rakam, boşluksuz) yaz.
- birthDate: YYYY-MM-DD formatında (örn. belgede "12.05.1990" ise "1990-05-12" yaz). Emin değilsen null bırak.`;

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

const INSPECTION_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe(
      "Görselde gerçekten bir Türkiye araç muayene (TÜVTÜRK) raporu, egzoz emisyon ölçüm belgesi/pulu, YA DA bir motorlu taşıt tescil belgesi (ruhsat) görülüyor mu?"
    ),
  type: z
    .enum(["Periodic", "Emission"])
    .nullable()
    .describe(
      "Belge türü — Araç Muayene istasyonu (TÜVTÜRK) raporuysa Periodic, Egzoz Emisyon ölçüm raporu/pulu ise Emission. Belge bir ruhsatsa (yalnızca muayene geçerlilik tarihi okunabiliyorsa) da Periodic yaz — ruhsattaki muayene geçerlilik tarihi her zaman periyodik araç muayenesine aittir."
    ),
  date: z.string().nullable().describe("Muayene / ölçüm tarihi, YYYY-MM-DD formatında — yalnızca gerçek bir muayene raporunda/pulunda bulunur, ruhsatta yoktur."),
  result: z
    .enum(["Pass", "Fail", "Defective"])
    .nullable()
    .describe("Sonuç — Uygun/Geçti ise Pass, Elverişsiz/Kaldı ise Fail, Kusurlu/eksiklik var ise Defective. Ruhsatta bu bilgi yoktur."),
  expiryDate: z
    .string()
    .nullable()
    .describe(
      "Bir sonraki muayene / geçerlilik tarihi, YYYY-MM-DD formatında. Ruhsatta bu, sağ bölümde yazan 'Muayene Geçerlilik Tarihi' (ya da 'Fenni Muayene Geçerlilik Tarihi') alanıdır."
    ),
  station: z.string().nullable().describe("Muayene istasyonu / ölçüm merkezi adı — ruhsatta bu bilgi yoktur."),
  cost: z.number().nullable().describe("Muayene / ölçüm ücreti (TL), yalnızca sayı — ruhsatta bu bilgi yoktur."),
});

const INSPECTION_PROMPT = `Bu görüntü bir Türkiye araç muayene (TÜVTÜRK) raporu, egzoz emisyon ölçüm belgesi/pulu, ya da bir motorlu taşıt tescil belgesi (ruhsat) mı incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- Belge bir muayene raporu / egzoz pulu ise:
  - type: "Araç Muayene İstasyonu" / TÜVTÜRK periyodik muayene raporuysa Periodic; "Egzoz Emisyon Ölçüm" raporu/pulu ise Emission.
  - date: muayene / ölçüm tarihi, YYYY-MM-DD formatında.
  - result: "Uygun" / "Geçti" ise Pass; "Elverişsiz" / "Kaldı" ise Fail; kusur/eksiklik belirtilmişse Defective.
  - expiryDate: bir sonraki muayene tarihi / geçerlilik süresi sonu, YYYY-MM-DD formatında.
  - station: muayeneyi/ölçümü yapan istasyon veya merkezin adı.
  - cost: ödenen ücret — yalnızca sayı, TL sembolü ve binlik ayırıcı olmadan (örn. 1250.00).
- Belge bir Motorlu Taşıt Tescil Belgesi (ruhsat) ise (muayene raporu DEĞİLSE): documentDetected=true yap; type=Periodic yaz; expiryDate'i ruhsatın sağ bölümünde yazan "Muayene Geçerlilik Tarihi" / "Fenni Muayene Geçerlilik Tarihi" alanından YYYY-MM-DD formatında doldur; date, result, station, cost alanlarını null bırak (ruhsatta bu bilgiler bulunmaz).`;

const INVOICE_DOC_SCHEMA = z.object({
  documentDetected: z
    .boolean()
    .describe("Görselde gerçekten bir Türkiye satış faturası (e-Fatura / e-Arşiv Fatura) görülüyor mu?"),
  number: z.string().nullable().describe("Fatura numarası, olduğu gibi (örn. MVL2026000000080)"),
  issuedAt: z.string().nullable().describe("Fatura düzenleme / tanzim tarihi, YYYY-MM-DD formatında"),
  periodFrom: z
    .string()
    .nullable()
    .describe("Faturanın kapsadığı hizmet/fatura döneminin başlangıcı — yalnızca faturada AÇIKÇA yazıyorsa, YYYY-MM-DD"),
  periodTo: z
    .string()
    .nullable()
    .describe("Faturanın kapsadığı hizmet/fatura döneminin bitişi — yalnızca faturada AÇIKÇA yazıyorsa, YYYY-MM-DD"),
  grossAmount: z.number().nullable().describe("Vergiler dahil ödenecek genel toplam tutar, yalnızca sayı"),
  customerTitle: z.string().nullable().describe("ALICI (faturanın kesildiği taraf) adı/unvanı — SATICI değil"),
  taxNo: z
    .string()
    .nullable()
    .describe("ALICI'nın Vergi Kimlik No'su (10 hane) ya da T.C. Kimlik No'su (11 hane) — SATICI'nınki değil"),
});

const INVOICE_DOC_PROMPT = `Bu görüntü bir Türkiye satış faturası (e-Fatura / e-Arşiv Fatura) mı incele.
Kurallar:
- Böyle bir belge değilse ya da hiçbir alan güvenle okunamıyorsa documentDetected=false yap ve tüm alanları null bırak. Asla tahmin etme.
- Belgeyse documentDetected=true yap; yalnızca NET okuduğun alanları doldur, okuyamadığını null bırak.
- Faturada iki taraf olur: SATICI (faturayı kesen firma) ve ALICI (fatura kesilen müşteri). customerTitle ve taxNo
  alanlarını YALNIZCA ALICI bölümünden al — SATICI bilgilerini asla bu alanlara yazma.
- number: fatura numarası, olduğu gibi.
- issuedAt: fatura düzenleme/tanzim tarihi, YYYY-MM-DD formatında.
- periodFrom/periodTo: yalnızca faturada "hizmet dönemi" / "fatura dönemi" gibi bir alan AÇIKÇA yazıyorsa doldur;
  yoksa ikisini de null bırak — asla fatura tarihinden tahmin etme.
- grossAmount: vergiler dahil ödenecek genel toplam tutar ("Ödenecek Tutar" / "Vergiler Dahil Toplam Tutar") —
  yalnızca sayı, TL sembolü ve binlik ayırıcı olmadan (örn. 36000.00).
- taxNo: ALICI'nın Vergi Kimlik No'su (10 hane) varsa onu, yoksa T.C. Kimlik No'sunu (11 hane) yaz — yalnızca rakamlar.`;

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

// One vision call: a document photo + a prompt + a Zod schema -> the parsed,
// schema-validated object. The SDK already retries 429/5xx with backoff
// (max_retries default 2), so no hand-rolled retry loop is needed here.
const claudeVisionJson = async (buffer, mimeType, prompt, schema) => {
  recordVisionUsage().catch(() => {});

  // Anthropic's "image" content block only accepts jpeg/png/gif/webp — a PDF
  // (poliçe/fatura is often uploaded as PDF, not a photo) needs the separate
  // "document" block instead, or the API rejects it with a 400.
  const fileBlock =
    mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } }
      : { type: "image", source: { type: "base64", media_type: mimeType, data: buffer.toString("base64") } };

  let response;
  try {
    response = await getClient().beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [fileBlock, { type: "text", text: prompt }],
          },
        ],
        output_format: betaZodOutputFormat(schema),
      },
      { timeout: 15000 }
    );
  } catch (err) {
    // Every non-quota failure surfaces to the admin as the same generic
    // "servis yoğun" toast, so the real cause (auth, timeout, overloaded,
    // bad request...) only shows up here in the server logs.
    console.error(
      "[claude vision]",
      err?.name,
      err?.status,
      err?.error?.error?.type || err?.error?.type,
      err?.message
    );

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
      const code =
        err.status === 401 || err.status === 403
          ? "AI_CONFIG"
          : err.status === 404
            ? "AI_MODEL"
            : err.status === 413
              ? "AI_FILE"
              : err.status === 429
                ? "AI_QUOTA"
                : err.status >= 500
                  ? "AI_PROVIDER"
                  : "AI_REQUEST";
      const e = new Error(`Claude API hatası (${err.status}): ${err.message}`);
      e.code = code;
      e.upstreamStatus = err.status;
      throw e;
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

const extractVehicleInspection = (buffer, mimeType) =>
  claudeVisionJson(buffer, mimeType, INSPECTION_PROMPT, INSPECTION_SCHEMA);

const extractInvoiceDocument = (buffer, mimeType) =>
  claudeVisionJson(buffer, mimeType, INVOICE_DOC_PROMPT, INVOICE_DOC_SCHEMA);

// --- Market price research (Fiyat Listesi "Yapay Zeka ile Araştır") -----

// Override with CLAUDE_RESEARCH_MODEL without a redeploy. A plain text+tool
// task (no vision), so this doesn't need to match CLAUDE_VISION_MODEL.
// 2026-10-18: Haiku over Sonnet — this is "research + summarize web search
// results into a suggested price", not fine-detail document reading (the
// accuracy ceiling that pushed the vision extractors to Sonnet). The admin
// reviews every suggestion with its sources before applying it, so a
// cheaper model here is an easy cost win (web search's own per-search fee
// is unchanged either way).
const RESEARCH_MODEL = process.env.CLAUDE_RESEARCH_MODEL || "claude-haiku-5-5";

// Turkish labels for the prompt — mirrors the same enum -> TR mapping kept
// locally in modules/vehicles/vehicles.controller.js and lib/seo-ld.js
// (this codebase's established pattern: a small hand-duplicated map per
// file that needs it, rather than a shared import).
const TRANSMISSION_LABELS = { Manual: "manuel", SemiAutomatic: "yarı otomatik", Automatic: "otomatik" };
const FUEL_LABELS = {
  Diesel: "dizel",
  Gasoline: "benzin",
  Hybrid: "hibrit",
  Electricity: "elektrik",
  LPG: "lpg",
  CNG: "cng",
  Hydrogen: "hidrojen",
};

const priceResearchPrompt = ({ brand, model, modelYear, transmission, fuelType }) => {
  const name = `${brand} ${model}`.trim();
  const yearPart = modelYear ? ` (${modelYear} model)` : "";
  const transmissionLabel = TRANSMISSION_LABELS[transmission] || null;
  const fuelLabel = FUEL_LABELS[fuelType] || null;
  const specParts = [transmissionLabel && `${transmissionLabel} vites`, fuelLabel && `${fuelLabel} yakıt`].filter(Boolean);
  const specPart = specParts.length ? `, ${specParts.join(", ")}` : "";

  return `Rol: Türkiye araç kiralama piyasasını izleyen bir fiyat analistisin.

Görev: "${name}"${yearPart}${specPart} özelliklerindeki araca ait GÜNCEL günlük ve aylık araç kiralama fiyatlarını, Türkiye'de faaliyet gösteren araç kiralama şirketlerinin (örn. Garenta, Budget, Avis, Enterprise, Lokalrent, Intercity Rent A Car, Locacar, Troya Rent A Car gibi ulusal/bölgesel kiralama firmaları) kendi web sitelerinde web araması yaparak araştır.

Kurallar:
- Öncelikle TAM OLARAK bu vites türü (${transmissionLabel || "belirtilmemiş"}) ve bu yakıt tipindeki (${fuelLabel || "belirtilmemiş"}) aracı ara — aynı model farklı vites/yakıt seçeneğiyle farklı fiyatlanır (örn. otomatik genelde manuelden, dizel genelde benzinden daha pahalı kiralanır), bunları birbirine karıştırma.
- Tam eşleşen vites/yakıt kombinasyonunu hiçbir kaynakta bulamazsan, en yakın/benzer kombinasyonu kullanabilirsin ama bunu summary'de açıkça belirt (örn. "otomatik versiyon bulunamadı, manuel fiyatı kullanıldı").
- En az 3, en fazla 6 farklı site/kaynaktan fiyat bulmaya çalış.
- Bir sitede yalnızca günlük VEYA yalnızca aylık fiyat varsa, bulduğunu yaz; diğerini null bırak.
- Hiçbir kaynak bulamazsan dailyPriceTRY ve monthlyPriceTRY alanlarını null yap, confidence="low" yap ve summary'de bunu açıkla — asla rakam uydurma.
- dailyPriceTRY / monthlyPriceTRY (özet kısımdaki): bulduğun kaynakların basit ortalaması, KDV dahil TL, yalnızca sayı (ondalıksız, en yakın tam sayıya yuvarla).
- confidence: bulduğun kaynak sayısı, fiyatların birbirine yakınlığına VE vites/yakıt eşleşmesinin tam olup olmadığına göre "low" (0-1 kaynak, çok dağınık, ya da vites/yakıt eşleşmiyor), "medium" (2-3 kaynak), "high" (4+ tutarlı kaynak, vites/yakıt tam eşleşiyor) seç.
- summary: Türkçe, 2-3 cümlelik kısa bir özet (kaç kaynak bulundu, fiyat aralığı nasıl, vites/yakıt tam eşleşti mi, dikkat edilmesi gereken bir şey var mı).

Araştırmayı bitirdikten sonra SADECE aşağıdaki JSON şemasında, başka hiçbir açıklama metni olmadan, bir \`\`\`json kod bloğu içinde yanıt ver:
{
  "dailyPriceTRY": sayı ya da null,
  "monthlyPriceTRY": sayı ya da null,
  "confidence": "low" | "medium" | "high",
  "summary": "...",
  "sources": [
    { "site": "site/firma adı", "dailyPriceTRY": sayı ya da null, "monthlyPriceTRY": sayı ya da null, "url": "kaynak URL" }
  ]
}`;
};

// One market-research call: Claude searches the live web (Anthropic's
// server-side web_search tool — the whole multi-query research loop happens
// within this single API call) for competitor rental prices and returns a
// suggested daily/monthly price + its sources. Nothing is persisted here —
// same "prefill, admin decides" pattern as the document-scan extractors
// above, just sourced from the web instead of an uploaded photo. This is
// noticeably slower (multiple real web searches) and costs more per call
// than a vision read, so it's deliberately opt-in (one button click per
// vehicle), never automatic.
const researchVehiclePrice = async ({ brand, model, modelYear, transmission, fuelType }) => {
  let response;
  try {
    response = await getClient().messages.create(
      {
        model: RESEARCH_MODEL,
        max_tokens: 4096,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 6,
            user_location: { type: "approximate", country: "TR", city: "Aliağa", region: "İzmir", timezone: "Europe/Istanbul" },
          },
        ],
        messages: [{ role: "user", content: priceResearchPrompt({ brand, model, modelYear, transmission, fuelType }) }],
      },
      { timeout: 90000 }
    );
  } catch (err) {
    console.error("[claude price research]", err?.name, err?.status, err?.error?.error?.type || err?.error?.type, err?.message);
    if (err instanceof Anthropic.RateLimitError) {
      const e = new Error("Yapay zeka fiyat araştırması hız sınırına takıldı. Birkaç dakika sonra tekrar deneyin.");
      e.code = "AI_QUOTA";
      throw e;
    }
    if (err instanceof Anthropic.APIConnectionError) {
      const e = new Error("Yapay zeka fiyat araştırması zamanında tamamlanamadı. Lütfen tekrar deneyin.");
      e.code = "AI_TIMEOUT";
      throw e;
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Claude API hatası (${err.status}): ${err.message}`);
    }
    throw err;
  }

  const text = (response.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/) || [])[0];
  if (!raw) throw new Error("Yapay zeka araştırma sonucu ayrıştırılamadı.");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Rare: the model occasionally mangles the JSON block — log it for
    // diagnosis, but the admin sees a plain "try again" toast either way.
    console.error("[claude price research] unparsable JSON:", raw.slice(0, 2000));
    throw new Error("Yapay zeka araştırma sonucu geçersiz JSON döndürdü.");
  }
  return parsed;
};

module.exports = {
  extractVehicleRegistration,
  extractCustomerDocument,
  extractVehicleInsurance,
  extractVehicleInspection,
  extractInvoiceDocument,
  researchVehiclePrice,
};
