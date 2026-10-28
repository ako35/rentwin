import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_PDF_PAGES = 6;
const MIN_TEXT_LENGTH = 45;
let pdfjsPromise;
let ocrWorkerPromise;

const fold = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0131\u0130]/g, "I")
    .toLocaleUpperCase("en-US");

const linesOf = (text) => String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

const getPdfJs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjs;
    });
  }
  return pdfjsPromise;
};

const getOcrWorker = async () => {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("tur+eng", 1));
  }
  try {
    return await ocrWorkerPromise;
  } catch (error) {
    ocrWorkerPromise = null;
    throw error;
  }
};

const readPdf = async (file) => {
  const pdfjs = await getPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pageTexts = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => `${item.str || ""}${item.hasEOL ? "\n" : " "}`).join(""));
    }
    const embeddedText = pageTexts.join("\n").trim();
    if (embeddedText.length >= MIN_TEXT_LENGTH) return embeddedText;

    const worker = await getOcrWorker();
    const scannedPages = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) continue;
      await page.render({ canvasContext: context, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      scannedPages.push(data.text || "");
      canvas.width = 0;
      canvas.height = 0;
    }
    return [embeddedText, ...scannedPages].filter(Boolean).join("\n");
  } finally {
    await pdf.destroy();
  }
};

const readText = async (file) => {
  if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) return readPdf(file);
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(file);
  return data.text || "";
};

const valueAfter = (text, labels) => {
  const lines = linesOf(text);
  const sorted = labels.map(fold).sort((a, b) => b.length - a.length);
  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = fold(lines[index]);
    const label = sorted.find((candidate) => normalizedLine.includes(candidate));
    if (!label) continue;
    const position = normalizedLine.indexOf(label);
    const inline = lines[index].slice(position + label.length).replace(/^\s*[:#\-–.]?\s*/, "").trim();
    if (inline && !/^[:#\-–.\s]+$/.test(inline)) return inline;
    const nextLine = lines[index + 1] || "";
    if (nextLine && !sorted.some((candidate) => fold(nextLine).startsWith(candidate))) return nextLine;
  }
  return "";
};

const parseDate = (raw) => {
  const match = String(raw || "").match(/\b(\d{1,4})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!match) return null;
  let year;
  let month;
  let day;
  if (match[1].length === 4) [, year, month, day] = match;
  else [, day, month, year] = match;
  if (year.length === 2) year = `20${year}`;
  const y = Number(year), m = Number(month), d = Number(day);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const dateAfter = (text, labels) => {
  const lines = linesOf(text);
  const sorted = labels.map(fold).sort((a, b) => b.length - a.length);
  for (let index = 0; index < lines.length; index += 1) {
    if (!sorted.some((label) => fold(lines[index]).includes(label))) continue;
    const parsed = parseDate(`${lines[index]} ${lines[index + 1] || ""}`);
    if (parsed) return parsed;
  }
  return null;
};

const parseMoney = (raw) => {
  const match = String(raw || "").replace(/\s/g, "").match(/-?\d[\d.,]*/);
  if (!match) return null;
  let value = match[0];
  if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  else if ((value.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(value)) value = value.replace(/\./g, "");
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const moneyAfter = (text, labels) => parseMoney(valueAfter(text, labels));
const labelDigits = (text, labels, lengths) => {
  const digits = valueAfter(text, labels).replace(/\D/g, "");
  return lengths.includes(digits.length) ? digits : null;
};
const empty = (keys) => Object.fromEntries(keys.map((key) => [key, null]));

const parseRegistration = (text) => {
  const n = fold(text);
  const data = empty(["brand", "model", "licensePlate", "modelYear", "chassisNo", "engineNo", "color", "fuelType", "registrationSerialNo", "registrationDate"]);
  data.brand = valueAfter(text, ["Marka", "Make"]) || null;
  data.model = valueAfter(text, ["Ticari Adi", "Tipi", "Arac Tipi"]) || null;
  const plate = valueAfter(text, ["Plaka No", "Tescil Plakasi", "Plaka"]).match(/\b(?:0?[1-9]|[1-7]\d|8[01])\s*[A-ZC GIOSU]{1,3}\s*\d{2,5}\b/i)
    || text.match(/\b(?:0?[1-9]|[1-7]\d|8[01])\s*[A-ZC GIOSU]{1,3}\s*\d{2,5}\b/i);
  data.licensePlate = plate ? plate[0].replace(/\s+/g, "").toLocaleUpperCase("tr-TR") : null;
  const year = valueAfter(text, ["Model Yili", "Imal Yili", "Yapim Yili"]).match(/\b(?:19|20)\d{2}\b/);
  data.modelYear = year ? Number(year[0]) : null;
  data.chassisNo = valueAfter(text, ["Sasi No", "Sasi Numarasi", "Sasi"]).replace(/[^A-Z0-9]/gi, "").toLocaleUpperCase("tr-TR") || null;
  data.engineNo = valueAfter(text, ["Motor No", "Motor Numarasi"]) || null;
  data.color = valueAfter(text, ["Renk", "Rengi"]) || null;
  const fuel = fold(valueAfter(text, ["Yakit Cinsi", "Yakit Turu"]));
  if (/DIZEL|DIESEL/.test(fuel)) data.fuelType = "Diesel";
  else if (/BENZIN|GASOLINE/.test(fuel)) data.fuelType = "Gasoline";
  else if (/HIBRIT|HYBRID/.test(fuel)) data.fuelType = "Hybrid";
  else if (/ELEKTRIK|ELECTRIC/.test(fuel)) data.fuelType = "Electricity";
  else if (/LPG/.test(fuel)) data.fuelType = "LPG";
  else if (/CNG/.test(fuel)) data.fuelType = "CNG";
  else if (/HIDROJEN|HYDROGEN/.test(fuel)) data.fuelType = "Hydrogen";
  data.registrationSerialNo = valueAfter(text, ["Belge Seri No", "Tescil Belge Seri No", "Seri No"]) || null;
  data.registrationDate = dateAfter(text, ["Ilk Tescil Tarihi", "Tescil Tarihi"]);
  return { documentDetected: /RUHSAT|TESCIL BELGESI|MOTORLU TASIT TESCIL|ARAC TESCIL/.test(n), ...data };
};

const parseIndividual = (text) => {
  const n = fold(text);
  const data = empty(["firstName", "lastName", "nationalId", "birthDate"]);
  data.lastName = valueAfter(text, ["Soyadi", "Surname"]) || null;
  data.firstName = valueAfter(text, ["Verilen Adlar", "Given Names", "Adi", "First Name"]) || null;
  data.nationalId = labelDigits(text, ["T.C. Kimlik No", "TC Kimlik No", "TR Identity No", "Kimlik Numarasi", "4d"], [11]);
  if (!data.nationalId && /PASAPORT|PASSPORT/.test(n)) data.nationalId = valueAfter(text, ["Pasaport No", "Passport No", "Passport Number"]).replace(/\s/g, "") || null;
  data.birthDate = dateAfter(text, ["Dogum Tarihi", "Date of Birth", "Birth Date"]);
  return { documentDetected: /EHLIYET|SURUCU BELGESI|DRIVING LICENCE|DRIVER LICENSE|KIMLIK KARTI|T.C. KIMLIK|IDENTITY CARD|PASAPORT|PASSPORT/.test(n), ...data };
};

const parseCorporate = (text) => {
  const n = fold(text);
  const data = empty(["companyTitle", "nationalId", "taxOffice", "address", "city", "district", "phoneNumber"]);
  data.companyTitle = valueAfter(text, ["Ticari Unvani", "Firma Unvani", "Sirket Unvani", "Unvan"]) || null;
  data.nationalId = labelDigits(text, ["Vergi Kimlik No", "Vergi No", "VKN", "T.C. Kimlik No", "TC Kimlik No"], [10, 11]);
  data.taxOffice = valueAfter(text, ["Vergi Dairesi"]) || null;
  data.address = valueAfter(text, ["Isyeri Adresi", "Adres"]) || null;
  data.city = valueAfter(text, ["Sehir", "Il"]) || null;
  data.district = valueAfter(text, ["Ilce"]) || null;
  data.phoneNumber = valueAfter(text, ["Telefon", "Tel No", "GSM"]).replace(/\D/g, "") || null;
  return { documentDetected: /VERGI LEVHASI|VERGI KIMLIK|VERGI DAIRESI|SIRKET KASESI|SIRKET UNVANI|TICARET UNVANI/.test(n), ...data };
};

const parseInsurance = (text) => {
  const n = fold(text);
  const data = empty(["type", "company", "policyNo", "startDate", "endDate", "premium"]);
  if (/KASKO/.test(n)) data.type = "Kasko";
  else if (/TRAFIK SIGORTASI|ZORUNLU MALI SORUMLULUK|MOTORLU KARA TASITLARI ZORUNLU/.test(n)) data.type = "Traffic";
  data.company = valueAfter(text, ["Sigorta Sirketi", "Sigortaci", "Sigorta Kurulusu"]) || null;
  data.policyNo = valueAfter(text, ["Police No", "Police Numarasi"]) || null;
  data.startDate = dateAfter(text, ["Baslangic Tarihi", "Police Baslangici", "Tanzim Tarihi"]);
  data.endDate = dateAfter(text, ["Bitis Tarihi", "Vade Sonu", "Police Bitisi"]);
  data.premium = moneyAfter(text, ["Brut Prim", "Toplam Prim", "Odenecek Prim", "Odeme Tutari"]);
  return { documentDetected: /SIGORTA POLICESI|POLICE NO|KASKO|TRAFIK SIGORTASI|ZORUNLU MALI SORUMLULUK/.test(n), ...data };
};

const parseInspection = (text) => {
  const n = fold(text);
  const data = empty(["type", "date", "result", "expiryDate", "station", "cost"]);
  const emission = /EGZOZ|EMISYON/.test(n);
  const registrationOnly = /RUHSAT|TESCIL BELGESI|MOTORLU TASIT TESCIL/.test(n) && !/MUAYENE RAPORU|TUVTURK|EGZOZ|EMISYON/.test(n);
  data.type = emission ? "Emission" : "Periodic";
  if (!registrationOnly) {
    data.date = dateAfter(text, ["Muayene Tarihi", "Islem Tarihi", "Olcum Tarihi", "Rapor Tarihi"]);
    if (/ELVERISIZ|KALDI|BASARISIZ/.test(n)) data.result = "Fail";
    else if (/KUSURLU|HAFIF KUSUR|AGIR KUSUR/.test(n)) data.result = "Defective";
    else if (/UYGUN|GECTI|BASARILI/.test(n)) data.result = "Pass";
    data.station = valueAfter(text, ["Muayene Istasyonu", "Istasyon Adi", "Olcum Merkezi"]) || null;
    data.cost = moneyAfter(text, ["Muayene Ucreti", "Egzoz Ucreti", "Olcum Ucreti", "Toplam Tutar", "Tahsilat"]);
  }
  data.expiryDate = dateAfter(text, ["Muayene Gecerlilik Tarihi", "Sonraki Muayene Tarihi", "Gecerlilik Tarihi"]);
  return { documentDetected: /MUAYENE|TUVTURK|EGZOZ|EMISYON/.test(n) || registrationOnly, ...data };
};

const parseInvoice = (text) => {
  const n = fold(text);
  const data = empty(["number", "issuedAt", "periodFrom", "periodTo", "grossAmount", "customerTitle", "taxNo"]);
  data.number = valueAfter(text, ["Fatura No", "Fatura Numarasi", "Invoice No"]) || text.match(/\b[A-Z]{3}\d{13}\b/i)?.[0] || null;
  data.issuedAt = dateAfter(text, ["Fatura Tarihi", "Duzenleme Tarihi", "Tanzim Tarihi", "Issue Date"]);
  data.periodFrom = dateAfter(text, ["Hizmet Donemi Baslangic", "Fatura Donemi Baslangic", "Donem Baslangic"]);
  data.periodTo = dateAfter(text, ["Hizmet Donemi Bitis", "Fatura Donemi Bitis", "Donem Bitis"]);
  data.grossAmount = moneyAfter(text, ["Vergiler Dahil Genel Toplam", "Vergiler Dahil Toplam", "Odenecek Tutar", "Genel Toplam"]);
  const buyerIndex = n.search(/\bSAYIN\b|\bALICI\b|\bMUSTERI\b/);
  const buyerText = buyerIndex >= 0 ? text.slice(buyerIndex, buyerIndex + 1200) : text;
  const sayinLine = linesOf(buyerText).find((line) => /^SAYIN\b/i.test(fold(line)));
  data.customerTitle = valueAfter(buyerText, ["Alici Unvani", "Ticari Unvan", "Unvan"])
    || (sayinLine && sayinLine.replace(/^SAYIN\s*/i, "").trim())
    || linesOf(buyerText).find((line) => line.length > 4 && !/^(SAYIN|ALICI|TCKN|VKN|VERGI NO|ADRES|TEL)/i.test(fold(line)))
    || null;
  data.taxNo = labelDigits(buyerText, ["Vergi Kimlik No", "Vergi No", "VKN", "T.C. Kimlik No", "TC Kimlik No", "TCKN"], [10, 11]);
  if (!data.taxNo && buyerIndex < 0) data.taxNo = labelDigits(text, ["Vergi Kimlik No", "VKN", "TCKN"], [10, 11]);
  return { documentDetected: /FATURA|E-ARSIV|E-FATURA|INVOICE/.test(n), ...data };
};

const PARSERS = { registration: parseRegistration, insurance: parseInsurance, inspection: parseInspection, individual: parseIndividual, corporate: parseCorporate, invoice: parseInvoice };

export const extractLocalDocument = async (file, kind) => {
  if (!file) throw new Error("Belge secilmedi.");
  const parser = PARSERS[kind];
  if (!parser) throw new Error("Belge turu desteklenmiyor.");
  return parser(await readText(file));
};


