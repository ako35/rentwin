// Google Gemini vision call: reads a Turkish vehicle registration certificate
// (ruhsat) photo and returns the fields as structured JSON, matching the
// Vehicle model's own field names/enum so the caller can pass it straight
// into a form. No SDK — Gemini's REST API is a single JSON POST.
const MODEL = "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

module.exports = { extractVehicleRegistration };
