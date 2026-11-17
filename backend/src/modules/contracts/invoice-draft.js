// "Yapay zekâ ile fatura hazırla" on the contract's Fatura tab. The admin
// types an instruction ("Kasım ayını faturala", "kalan tutarın tamamı"); the
// model only INTERPRETS it — which period, which billable items — and every
// amount is computed here from the contract's own data with the same pricing
// rules as the rest of the system (contract-fields.pricePeriod). Nothing is
// saved: the draft prefills the invoice form and lists the lines to type into
// the e-Fatura portal (TÜRMOB for Şair Turizm, Unidox for Movilo).
const { pricePeriod } = require("./contract-fields");
const { round2 } = require("../../lib/dates");

const LESSORS = {
  SAIR: { name: "ŞAİR TURİZM OTO KİRALAMA LTD. ŞTİ.", portal: "TÜRMOB" },
  MOVILO: { name: "MOVİLO ULAŞIM TEKNOLOJİ A.Ş.", portal: "Unidox" },
};

const CHARGE_LABELS = {
  HGS_OGS: "HGS/OGS geçiş bedeli",
  KM_EXCESS: "Kilometre aşım bedeli",
  DAMAGE: "Hasar bedeli",
  ROADSIDE: "Yol yardım bedeli",
  CLEANING: "Temizlik bedeli",
  FUEL: "Yakıt farkı",
  DEPOSIT: "Depozito",
  ONE_WAY: "Tek yön bedeli",
  OTHER: "Diğer masraf",
};

const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const trDay = (d) => {
  const [y, m, day] = isoDay(d).split("-");
  return `${day}.${m}.${y}`;
};

// Contract times are stored as wall-clock values in UTC (see lib/dates
// parseFrontendDateTime). A period day from the model becomes a moment at the
// pick-up's time of day, except the rental's own first/last day which keep the
// exact pick-up/drop-off time — so "15.11 – 15.12" on a contract picked up at
// 14:12 on the 15th prices as exactly one month.
const atRentalTime = (day, contract, edge) => {
  if (edge === "from" && day === isoDay(contract.pickUpTime)) return new Date(contract.pickUpTime);
  if (edge === "to" && day === isoDay(contract.dropOffTime)) return new Date(contract.dropOffTime);
  const p = new Date(contract.pickUpTime);
  const hh = String(p.getUTCHours()).padStart(2, "0");
  const mm = String(p.getUTCMinutes()).padStart(2, "0");
  const d = new Date(`${day}T${hh}:${mm}:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Who the invoice is made out to: the reference cari if the contract has one,
// else the renting customer (same rule as createInvoice). Individuals carry
// their T.C. kimlik no — the e-Arşiv portal needs it even though the stored
// invoice row keeps taxNo only for corporate customers.
const billToOf = (contract) => {
  const u = contract.referenceUser || contract.user || {};
  const corporate = u.customerType === "Kurumsal";
  return {
    type: corporate ? "Kurumsal" : "Bireysel",
    title: (corporate && u.companyTitle) || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    taxNo: u.nationalId || null,
    taxNoLabel: corporate ? "VKN" : "TCKN",
    taxOffice: u.taxOffice || null,
    address: [u.address, u.district, u.city].filter(Boolean).join(", ") || null,
    email: u.email || null,
  };
};

const unitPriceOf = (contract) => (contract.rentalType === "MONTHLY" ? contract.monthlyPrice : contract.dailyPrice) || 0;

// What the model sees: the contract's billable items with ids, already-issued
// invoices and the amounts that are already settled. Gross figures throughout.
const buildInvoiceContext = (contract, today = new Date()) => {
  const vatRate = contract.vatRate ?? 20;
  const invoices = (contract.invoices || []).map((inv) => ({
    no: inv.number,
    tarih: isoDay(inv.issuedAt),
    donemBaslangic: isoDay(inv.periodFrom),
    donemBitis: isoDay(inv.periodTo),
    tutarKdvDahil: inv.grossAmount,
  }));
  const invoiced = round2((contract.invoices || []).reduce((s, inv) => s + (inv.grossAmount || 0), 0));
  return {
    bugun: isoDay(today),
    kontrat: {
      no: contract.contractNo,
      durum: contract.status,
      kiralamaTuru: contract.rentalType === "MONTHLY" ? "Aylık" : "Günlük",
      birimFiyat: unitPriceOf(contract),
      birimFiyatKdv: contract.rentalType === "MONTHLY" ? "KDV hariç (aylık)" : "KDV dahil (günlük)",
      kdvOrani: vatRate,
      alis: isoDay(contract.pickUpTime),
      birakis: isoDay(contract.dropOffTime),
      iadeTarihi: isoDay(contract.returnedAt),
      toplamTutarKdvDahil: contract.totalPrice,
      faturalanmisToplam: invoiced,
      faturalanmamisKalan: round2((contract.totalPrice || 0) - invoiced),
    },
    uzatmalar: (contract.extensions || []).map((e) => ({
      id: e.id,
      eskiBitis: isoDay(e.previousDropOff),
      yeniBitis: isoDay(e.newDropOff),
      tutarKdvDahil: e.extraAmount,
    })),
    ekHizmetler: (contract.extras || []).map((x) => x.name),
    ekHizmetlerToplamKdvDahil: contract.extrasTotal || 0,
    tekYonUcretiKdvDahil: contract.oneWayFee || 0,
    donusMasraflari: (contract.returnCharges || []).map((r) => ({
      id: r.id,
      tur: CHARGE_LABELS[r.category] || r.category,
      aciklama: r.description || null,
      donemBaslangic: isoDay(r.periodFrom),
      donemBitis: isoDay(r.periodTo),
    })),
    kesilmisFaturalar: invoices,
  };
};

// Structured-output schema for the model's interpretation (no amounts except
// a CUSTOM line whose amount the admin typed in the instruction).
const INVOICE_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["periodFrom", "periodTo", "lines", "note", "explanation", "warnings"],
  properties: {
    periodFrom: { type: ["string", "null"], description: "Fatura dönemi başlangıcı, YYYY-MM-DD" },
    periodTo: { type: ["string", "null"], description: "Fatura dönemi bitişi, YYYY-MM-DD" },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "refId", "from", "to", "description", "customGross"],
        properties: {
          kind: { type: "string", enum: ["RENTAL", "EXTENSION", "EXTRAS", "ONE_WAY", "RETURN_CHARGE", "CUSTOM"] },
          refId: { type: ["string", "null"] },
          from: { type: ["string", "null"] },
          to: { type: ["string", "null"] },
          description: { type: "string" },
          customGross: { type: ["number", "null"] },
        },
      },
    },
    note: { type: ["string", "null"] },
    explanation: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
};

const lineFromGross = ({ kind, description, gross, vatRate, quantity = 1, unit = "Adet", unitPriceNet = null }) => {
  const net = round2(gross / (1 + vatRate / 100));
  return {
    kind,
    description,
    quantity,
    unit,
    unitPriceNet: unitPriceNet != null ? round2(unitPriceNet) : round2(net / quantity),
    vatRate,
    netAmount: net,
    taxAmount: round2(gross - net),
    grossAmount: round2(gross),
  };
};

// Turns the model's interpretation into priced lines. Every amount comes from
// the contract; ids the contract doesn't have, bad dates and empty lines are
// dropped with a warning instead of guessed.
const computeInvoiceDraft = (contract, ai) => {
  const vatRate = contract.vatRate ?? 20;
  const warnings = [...(ai.warnings || [])];
  const lines = [];
  const unit = unitPriceOf(contract);

  for (const l of ai.lines || []) {
    if (l.kind === "RENTAL") {
      const from = l.from && atRentalTime(l.from, contract, "from");
      const to = l.to && atRentalTime(l.to, contract, "to");
      if (!from || !to || to <= from) {
        warnings.push(`Kira kalemi atlandı: dönem tarihleri geçersiz (${l.from || "?"} – ${l.to || "?"}).`);
        continue;
      }
      if (!(unit > 0)) {
        warnings.push("Kontratta kira birim fiyatı yok; kira kalemi hesaplanamadı.");
        continue;
      }
      if (from < new Date(contract.pickUpTime) || to > new Date(contract.dropOffTime)) {
        warnings.push(`Kira dönemi (${trDay(from)} – ${trDay(to)}) kontrat süresinin dışına taşıyor.`);
      }
      const p = pricePeriod({ rentalType: contract.rentalType, unitPrice: unit, start: from, end: to, vatRate });
      const span = `${trDay(from)} – ${trDay(to)}`;
      if (contract.rentalType === "MONTHLY") {
        const term = [p.months ? `${p.months} ay` : null, p.kistDays ? `${p.kistDays} gün` : null].filter(Boolean).join(" + ");
        const clean = p.months > 0 && !p.kistDays;
        lines.push(
          lineFromGross({
            kind: "RENTAL",
            description: `${l.description || "Araç kiralama bedeli"} (${span}, ${term})`,
            gross: p.grossAmount,
            vatRate,
            quantity: clean ? p.months : 1,
            unit: clean ? "Ay" : "Adet",
            unitPriceNet: clean ? unit : null,
          })
        );
      } else {
        lines.push(
          lineFromGross({
            kind: "RENTAL",
            description: `${l.description || "Araç kiralama bedeli"} (${span})`,
            gross: p.grossAmount,
            vatRate,
            quantity: p.kistDays,
            unit: "Gün",
            unitPriceNet: unit / (1 + vatRate / 100),
          })
        );
      }
    } else if (l.kind === "EXTENSION") {
      const ext = (contract.extensions || []).find((e) => e.id === l.refId);
      if (!ext || !(ext.extraAmount > 0)) {
        warnings.push("Uzatma kalemi atlandı: kontratta bu uzatma bulunamadı ya da tutarı yok.");
        continue;
      }
      lines.push(
        lineFromGross({
          kind: "EXTENSION",
          description: `${l.description || "Kiralama uzatma bedeli"} (${trDay(ext.previousDropOff)} – ${trDay(ext.newDropOff)})`,
          gross: ext.extraAmount,
          vatRate,
        })
      );
    } else if (l.kind === "EXTRAS") {
      if (!(contract.extrasTotal > 0)) {
        warnings.push("Ek hizmet kalemi atlandı: kontratta ek hizmet tutarı yok.");
        continue;
      }
      const names = (contract.extras || []).map((x) => x.name).join(", ");
      lines.push(lineFromGross({ kind: "EXTRAS", description: l.description || `Ek hizmetler${names ? ` (${names})` : ""}`, gross: contract.extrasTotal, vatRate }));
    } else if (l.kind === "ONE_WAY") {
      if (!(contract.oneWayFee > 0)) {
        warnings.push("Tek yön kalemi atlandı: kontratta tek yön ücreti yok.");
        continue;
      }
      lines.push(lineFromGross({ kind: "ONE_WAY", description: l.description || "Tek yön bedeli", gross: contract.oneWayFee, vatRate }));
    } else if (l.kind === "RETURN_CHARGE") {
      const r = (contract.returnCharges || []).find((x) => x.id === l.refId);
      if (!r) {
        warnings.push("Dönüş masrafı kalemi atlandı: kontratta bu masraf bulunamadı.");
        continue;
      }
      const net = (r.amount || 0) * (r.quantity || 1);
      const gross = r.applyVat ? net * (1 + vatRate / 100) : net;
      if (!(gross > 0)) continue;
      const label = l.description || [CHARGE_LABELS[r.category] || r.category, r.description].filter(Boolean).join(" — ");
      lines.push(lineFromGross({ kind: "RETURN_CHARGE", description: label, gross, vatRate }));
    } else if (l.kind === "CUSTOM") {
      const gross = Number(l.customGross);
      if (!(gross > 0)) {
        warnings.push("Talimattaki serbest kalem atlandı: tutar anlaşılamadı.");
        continue;
      }
      lines.push(lineFromGross({ kind: "CUSTOM", description: l.description || "Hizmet bedeli", gross, vatRate }));
      warnings.push(`"${l.description}" tutarı (${gross} TL, KDV dahil) kontrattan değil talimattan alındı; kontrol edin.`);
    }
  }

  const netTotal = round2(lines.reduce((s, x) => s + x.netAmount, 0));
  const grossTotal = round2(lines.reduce((s, x) => s + x.grossAmount, 0));

  // Same period already invoiced?
  const pf = ai.periodFrom || null;
  const pt = ai.periodTo || null;
  if (pf && pt) {
    for (const inv of contract.invoices || []) {
      const a = isoDay(inv.periodFrom);
      const b = isoDay(inv.periodTo);
      if (a && b && a < pt && pf < b) warnings.push(`Bu dönem ${inv.number} numaralı faturanın dönemiyle (${trDay(a)} – ${trDay(b)}) çakışıyor.`);
    }
  }
  if (!contract.lessorCompany) warnings.push("Kontratta kiraya veren şirket (Şair / Movilo) seçili değil; faturanın hangi şirketten kesileceğini kontrol edin.");

  return {
    periodFrom: pf,
    periodTo: pt,
    lessor: contract.lessorCompany ? { code: contract.lessorCompany, ...LESSORS[contract.lessorCompany] } : null,
    billTo: billToOf(contract),
    lines,
    netTotal,
    taxTotal: round2(grossTotal - netTotal),
    grossTotal,
    vatRate,
    note: ai.note || null,
    explanation: ai.explanation || "",
    warnings: [...new Set(warnings)],
  };
};

module.exports = { buildInvoiceContext, computeInvoiceDraft, billToOf, INVOICE_DRAFT_SCHEMA, LESSORS };
