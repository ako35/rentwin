const test = require("node:test");
const assert = require("node:assert/strict");
const { computeInvoiceDraft, buildInvoiceContext, billToOf } = require("./invoice-draft");

const base = (over = {}) => ({
  contractNo: "K-2026-00111",
  status: "CREATED",
  rentalType: "MONTHLY",
  monthlyPrice: 49000,
  dailyPrice: null,
  vatRate: 20,
  pickUpTime: new Date("2026-11-10T14:12:00.000Z"),
  dropOffTime: new Date("2027-01-10T14:12:00.000Z"),
  returnedAt: null,
  totalPrice: 117600,
  lessorCompany: "SAIR",
  extrasTotal: 0,
  oneWayFee: 0,
  extensions: [],
  extras: [],
  returnCharges: [],
  invoices: [],
  user: { customerType: "Kurumsal", companyTitle: "RMA YAPCO A.Ş.", nationalId: "3321005205", taxOffice: "ALİAĞA", address: "Siteler Mah.", city: "İzmir", district: "Aliağa", email: "x@y.com" },
  referenceUser: null,
  ...over,
});
const ai = (lines, over = {}) => ({ periodFrom: null, periodTo: null, lines, note: null, explanation: "", warnings: [], ...over });
const line = (over) => ({ kind: "RENTAL", refId: null, from: null, to: null, description: "Araç kiralama bedeli", customGross: null, ...over });

test("one contract month is priced at the monthly rate, net + VAT", () => {
  const d = computeInvoiceDraft(base(), ai([line({ from: "2026-11-10", to: "2026-12-10" })], { periodFrom: "2026-11-10", periodTo: "2026-12-10" }));
  assert.equal(d.lines.length, 1);
  assert.equal(d.lines[0].quantity, 1);
  assert.equal(d.lines[0].unit, "Ay");
  assert.equal(d.lines[0].unitPriceNet, 49000);
  assert.equal(d.netTotal, 49000);
  assert.equal(d.taxTotal, 9800);
  assert.equal(d.grossTotal, 58800);
  assert.equal(d.lessor.portal, "TÜRMOB");
});

test("a month plus extra days prorates the days at a 30-day month", () => {
  const d = computeInvoiceDraft(base(), ai([line({ from: "2026-11-10", to: "2026-12-15" })]));
  // 1 month + 5 days: 49000 + 5 * 1633.33
  assert.equal(d.lines[0].netAmount, 57166.65);
  assert.equal(d.lines[0].unit, "Adet");
  assert.match(d.lines[0].description, /1 ay \+ 5 gün/);
});

test("daily rentals treat the daily price as VAT-inclusive", () => {
  const c = base({ rentalType: "DAILY", monthlyPrice: null, dailyPrice: 3000, dropOffTime: new Date("2026-11-15T14:12:00.000Z") });
  const d = computeInvoiceDraft(c, ai([line({ from: "2026-11-10", to: "2026-11-15" })]));
  assert.equal(d.lines[0].quantity, 5);
  assert.equal(d.lines[0].unit, "Gün");
  assert.equal(d.grossTotal, 15000);
  assert.equal(d.netTotal, 12500);
  assert.equal(d.lines[0].unitPriceNet, 2500);
});

test("extensions and return charges take their amounts from the contract, not the model", () => {
  const c = base({
    extensions: [{ id: "e1", previousDropOff: new Date("2026-12-10T14:12:00Z"), newDropOff: new Date("2027-01-10T14:12:00Z"), extraAmount: 58800 }],
    returnCharges: [{ id: "r1", category: "HGS_OGS", description: null, amount: 250, quantity: 2, applyVat: false }, { id: "r2", category: "CLEANING", amount: 500, quantity: 1, applyVat: true }],
  });
  const d = computeInvoiceDraft(c, ai([
    line({ kind: "EXTENSION", refId: "e1", customGross: 1 }),
    line({ kind: "RETURN_CHARGE", refId: "r1", description: "" }),
    line({ kind: "RETURN_CHARGE", refId: "r2", description: "" }),
  ]));
  assert.deepEqual(d.lines.map((l) => l.grossAmount), [58800, 500, 600]);
  assert.match(d.lines[1].description, /HGS\/OGS/);
});

test("unknown ids and invalid periods are dropped with a warning", () => {
  const d = computeInvoiceDraft(base(), ai([
    line({ kind: "EXTENSION", refId: "nope" }),
    line({ from: "2026-12-10", to: "2026-11-10" }),
  ]));
  assert.equal(d.lines.length, 0);
  assert.equal(d.warnings.length, 2);
});

test("a custom line keeps the typed amount and is flagged", () => {
  const d = computeInvoiceDraft(base(), ai([line({ kind: "CUSTOM", description: "Hasar bedeli", customGross: 1200 })]));
  assert.equal(d.grossTotal, 1200);
  assert.equal(d.netTotal, 1000);
  assert.ok(d.warnings.some((w) => w.includes("talimattan")));
});

test("an overlapping, already-invoiced period is warned about", () => {
  const c = base({ invoices: [{ number: "GIB2026000000001", issuedAt: new Date("2026-11-11"), periodFrom: new Date("2026-11-10"), periodTo: new Date("2026-12-10"), grossAmount: 58800 }] });
  const d = computeInvoiceDraft(c, ai([line({ from: "2026-11-10", to: "2026-12-10" })], { periodFrom: "2026-11-10", periodTo: "2026-12-10" }));
  assert.ok(d.warnings.some((w) => w.includes("GIB2026000000001")));
});

test("bill-to uses the reference cari when set and the TCKN for individuals", () => {
  const c = base({ referenceUser: { customerType: "Bireysel", firstName: "Ayşe", lastName: "Yılmaz", nationalId: "12345678901" } });
  const b = billToOf(c);
  assert.equal(b.title, "Ayşe Yılmaz");
  assert.equal(b.taxNoLabel, "TCKN");
  assert.equal(b.taxNo, "12345678901");
});

test("the model context lists remaining amount and issued invoices", () => {
  const c = base({ invoices: [{ number: "A1", issuedAt: new Date("2026-11-11"), periodFrom: null, periodTo: null, grossAmount: 58800 }] });
  const ctx = buildInvoiceContext(c, new Date("2026-11-17T10:00:00Z"));
  assert.equal(ctx.bugun, "2026-11-17");
  assert.equal(ctx.kontrat.faturalanmamisKalan, 58800);
  assert.equal(ctx.kesilmisFaturalar[0].no, "A1");
});
