const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const asyncHandler = require("../../middleware/async-handler");
const { interpretInvoiceInstruction } = require("../../lib/claude");
const { buildInvoiceContext, computeInvoiceDraft, INVOICE_DRAFT_SCHEMA } = require("./invoice-draft");

const PARTY = {
  firstName: true,
  lastName: true,
  customerType: true,
  companyTitle: true,
  nationalId: true,
  taxOffice: true,
  address: true,
  city: true,
  district: true,
  email: true,
};

const AI_STATUS = { AI_CONFIG: 503, AI_QUOTA: 429, AI_TIMEOUT: 504, AI_REFUSED: 422 };

// POST /contracts/admin/:id/invoices/ai-draft/auth  { instruction }
// Returns a priced invoice draft for the admin to check; saves nothing.
const draftInvoice = asyncHandler(async (req, res) => {
  const instruction = String(req.body?.instruction || "").trim();
  if (!instruction) throw new HttpError(400, "Talimat yazılmalıdır.", "INSTRUCTION_REQUIRED");
  if (instruction.length > 500) throw new HttpError(400, "Talimat en fazla 500 karakter olabilir.");

  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: PARTY },
      referenceUser: { select: PARTY },
      extensions: { orderBy: { createdAt: "asc" } },
      extras: true,
      returnCharges: true,
      invoices: { orderBy: { issuedAt: "asc" } },
    },
  });
  if (!contract) throw new HttpError(404, "Contract not found.");

  let ai;
  try {
    ai = await interpretInvoiceInstruction({
      context: buildInvoiceContext(contract),
      instruction,
      schema: INVOICE_DRAFT_SCHEMA,
    });
  } catch (err) {
    throw new HttpError(AI_STATUS[err.code] || 502, err.message, err.code || "AI_ERROR");
  }

  res.json(computeInvoiceDraft(contract, ai));
});

module.exports = { draftInvoice };
