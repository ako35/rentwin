const Anthropic = require("@anthropic-ai/sdk");

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

// --- Invoice instruction ("Yapay zekâ ile fatura hazırla") ---------------

// Override with CLAUDE_INVOICE_MODEL without a redeploy. The model only
// interprets the admin's instruction against the contract's billable items;
// every amount is computed afterwards in modules/contracts/invoice-draft.js.
const INVOICE_MODEL = process.env.CLAUDE_INVOICE_MODEL || "claude-opus-5-5";

const INVOICE_SYSTEM = `Sen Rentwin araç kiralama şirketinin yönetim panelindeki fatura asistanısın. Yönetici bir kiralama kontratı için Türkçe bir talimat yazar ("Kasım ayını faturala", "kalan tutarın tamamını tek fatura yap", "uzatmayı ve HGS'yi faturala" gibi). Görevin bu talimatı, sana JSON olarak verilen kontrat bilgilerine göre bir fatura taslağına çevirmek.

Kurallar:
- Tutar hesaplama; tutarları sistem hesaplar. Sen yalnızca hangi dönemin ve hangi kalemlerin faturalanacağını seç.
- Kalem türleri: RENTAL (kira; from/to ile dönem ver), EXTENSION (refId = uzatma id), EXTRAS (ek hizmetlerin tamamı), ONE_WAY (tek yön ücreti), RETURN_CHARGE (refId = dönüş masrafı id), CUSTOM (yalnızca talimatta tutarı açıkça yazılmış, kontratta karşılığı olmayan bir kalem; customGross = KDV dahil tutar). CUSTOM dışındaki kalemlerde customGross null olsun.
- Ay ya da tarih aralığıyla verilen talimatlarda kirayı RENTAL ile o dönem için faturala; dönem kontratın alış–bırakış aralığında kalsın. Uzatılmış tarihleri de RENTAL ile faturalayabilirsin; yalnızca talimat açıkça "uzatmayı faturala" derse EXTENSION kullan ve aynı günleri iki kez faturalama.
- "Kalan", "faturalanmamış" gibi talimatlarda daha önce kesilmiş faturaların dönemlerini ve tutarlarını dikkate al; aynı dönemi tekrar faturalama.
- Bir ayı faturalarken dönem kontratın alış gününden başlar (ör. alış 15'iyse 15.11 – 15.12). Takvim ayı istendiğini açıkça söylemedikçe kontrat aylarını kullan.
- Talimat kontrattaki bilgilerle çelişiyorsa ya da belirsizse en makul taslağı hazırla ve warnings'e kısaca yaz. Uydurma bilgi ekleme.
- periodFrom / periodTo: faturanın kapsadığı dönem (YYYY-MM-DD); dönem yoksa null.
- description: kısa Türkçe kalem açıklaması (tarih yazma, sistem ekler). note: faturaya düşülecek kısa not ya da null. explanation: ne hazırladığını anlatan 1-2 cümle. warnings: Türkçe kısa uyarılar (yoksa boş liste).`;

const interpretInvoiceInstruction = async ({ context, instruction, schema }) => {
  let response;
  try {
    response = await getClient().beta.messages.create(
      {
        model: INVOICE_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema } },
        system: INVOICE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Kontrat bilgileri:\n${JSON.stringify(context, null, 1)}\n\nTalimat: ${instruction}`,
          },
        ],
      },
      { timeout: 60000 }
    );
  } catch (err) {
    console.error("[claude invoice]", err?.name, err?.status, err?.error?.error?.type || err?.error?.type, err?.message);
    if (err instanceof Anthropic.AuthenticationError) {
      const e = new Error("Yapay zekâ anahtarı (ANTHROPIC_API_KEY) geçersiz. Vercel ortam değişkenlerinde güncellenmesi gerekiyor.");
      e.code = "AI_CONFIG";
      throw e;
    }
    if (err instanceof Anthropic.RateLimitError) {
      const e = new Error("Yapay zekâ hız sınırına takıldı. Birkaç dakika sonra tekrar deneyin.");
      e.code = "AI_QUOTA";
      throw e;
    }
    if (err instanceof Anthropic.APIConnectionError) {
      const e = new Error("Yapay zekâ zamanında yanıt vermedi. Lütfen tekrar deneyin.");
      e.code = "AI_TIMEOUT";
      throw e;
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Claude API hatası (${err.status}): ${err.message}`);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    const e = new Error("Yapay zekâ bu talimatı işlemedi. Talimatı farklı yazıp tekrar deneyin.");
    e.code = "AI_REFUSED";
    throw e;
  }
  if (response.stop_reason === "max_tokens") throw new Error("Yapay zekâ yanıtı yarıda kesildi.");

  const text = (response.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    console.error("[claude invoice] unparsable JSON:", text.slice(0, 2000));
    throw new Error("Yapay zekâ yanıtı ayrıştırılamadı.");
  }
};

module.exports = { interpretInvoiceInstruction };
