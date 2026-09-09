// Google Gemini calls over the plain REST API (no SDK — each is a single JSON
// POST): (1) vision — read a Turkish vehicle registration certificate (ruhsat)
// photo into structured fields; (2) image generation — produce a studio catalog
// photo of a vehicle from its make/model/colour.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-3.6-flash";
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

const extractVehicleRegistration = async (buffer, mimeType) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil.");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema: REGISTRATION_SCHEMA },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini API hatası (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API'den beklenmeyen yanıt.");
  return JSON.parse(text);
};

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

module.exports = { extractVehicleRegistration, generateVehicleImage };
