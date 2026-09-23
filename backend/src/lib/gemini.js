// Google Gemini image generation ("Nano Banana"): produce a studio catalog
// photo of a vehicle from its make/model/colour. Document vision extraction
// (ruhsat/ehliyet/sigorta) moved to Claude — see lib/claude.js.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Image generation has NO free-tier quota — the project behind GEMINI_API_KEY
// must have billing enabled or the call returns HTTP 429.
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

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

module.exports = {
  generateVehicleImage,
};
