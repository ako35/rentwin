const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("./prisma");

let client = null;
const getClient = () => {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error = new Error("ANTHROPIC_API_KEY tanımlı değil.");
    error.code = "AI_CONFIG";
    throw error;
  }
  client = new Anthropic({ apiKey, maxRetries: 1 });
  return client;
};
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

module.exports = { researchVehiclePrice };
