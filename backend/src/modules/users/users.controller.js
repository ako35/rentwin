const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { hashPassword, comparePassword } = require("../../lib/password");
const { serializeUser } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "firstName", "lastName", "email", "createdAt"];

// customerCode is auto-assigned on create and never editable afterwards, so it
// is deliberately absent here.
const CUSTOMER_STRING_FIELDS = ["companyTitle", "taxOffice", "nationalId", "city", "district", "notes"];

const CUSTOMER_CODE_PREFIX = "M";
const CUSTOMER_CODE_PAD = 5;

// Auto-assigned customer code: M00001, M00002 … (highest existing + 1).
const nextCustomerCode = async (client = prisma) => {
  const last = await client.user.findFirst({
    where: { customerCode: { startsWith: CUSTOMER_CODE_PREFIX } },
    orderBy: { customerCode: "desc" },
    select: { customerCode: true },
  });
  const lastNum = last ? parseInt(last.customerCode.slice(CUSTOMER_CODE_PREFIX.length), 10) || 0 : 0;
  return `${CUSTOMER_CODE_PREFIX}${String(lastNum + 1).padStart(CUSTOMER_CODE_PAD, "0")}`;
};

const applyCustomerFields = (body, data) => {
  CUSTOMER_STRING_FIELDS.forEach((f) => {
    if (f in body) data[f] = body[f] === "" ? null : body[f];
  });
  if ("active" in body) data.active = Boolean(body.active);
  if ("customerType" in body) {
    data.customerType = body.customerType === "Kurumsal" ? "Kurumsal" : "Bireysel";
  }
};

// Bireysel müşteri = 11 haneli TC, Kurumsal müşteri = 10 haneli vergi no.
// Yalnızca rakam, zorunlu ve her numara tek bir müşteride.
const assertNationalId = async (body, currentId) => {
  const isCorporate = body.customerType === "Kurumsal";
  const value = (body.nationalId == null ? "" : String(body.nationalId)).trim();
  const label = isCorporate ? "Vergi numarası" : "TC kimlik numarası";
  const length = isCorporate ? 10 : 11;

  if (!value) throw new HttpError(400, `${label} zorunludur.`);
  if (!/^\d+$/.test(value) || value.length !== length) {
    throw new HttpError(400, `${label} tam olarak ${length} haneli ve yalnızca rakamlardan oluşmalıdır.`);
  }

  const clash = await prisma.user.findFirst({
    where: { nationalId: value, ...(currentId ? { id: { not: currentId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw new HttpError(409, `Bu ${isCorporate ? "vergi numarası" : "TC numarası"} zaten başka bir müşteride kayıtlı.`);
  }
};

// Contract totals for a set of customers: debit = Σ contract grand totals,
// credit = Σ payments, balance = credit - debit (negative => customer owes).
const customerTotals = async (userIds) => {
  if (!userIds.length) return {};
  const rows = await prisma.reservation.findMany({
    where: { userId: { in: userIds }, status: { not: "CANCELLED" } },
    select: { userId: true, totalPrice: true, payments: { select: { amount: true } } },
  });
  const totals = {};
  for (const r of rows) {
    const t = totals[r.userId] || (totals[r.userId] = { debit: 0, credit: 0 });
    t.debit += r.totalPrice || 0;
    t.credit += r.payments.reduce((s, p) => s + p.amount, 0);
  }
  return totals;
};

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, address, zipCode } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { firstName, lastName, email, phoneNumber, address, zipCode: String(zipCode) },
  });

  res.json(serializeUser(user));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await comparePassword(oldPassword || "", user.passwordHash);
  if (!valid) {
    throw new HttpError(400, "Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.json({ message: "Password updated." });
});

const getUserAdmin = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new HttpError(404, "User not found.");
  res.json(serializeUser(user));
});

const getUsersByPageAdmin = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const { role, q } = req.query;
  const where = {
    ...(role ? { roles: { has: role } } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { companyTitle: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { nationalId: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [content, totalElements] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
    }),
    prisma.user.count({ where }),
  ]);

  const totals = await customerTotals(content.map((u) => u.id));

  res.json(
    buildPageResponse({
      content: content.map((u) => {
        const t = totals[u.id] || { debit: 0, credit: 0 };
        return { ...serializeUser(u), debit: t.debit, credit: t.credit, balance: t.credit - t.debit };
      }),
      totalElements,
      page,
      size,
      sortField,
    })
  );
});

const createUserAdmin = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, address, zipCode, roles, password, customerType } = req.body;

  const isCorporate = customerType === "Kurumsal";
  // Kurumsal: all contact fields mandatory. Bireysel: name + email.
  const requiredFields = isCorporate
    ? ["companyTitle", "firstName", "lastName", "taxOffice", "phoneNumber", "email", "address", "city", "district"]
    : ["firstName", "lastName", "email"];
  if (requiredFields.some((f) => !String(req.body[f] || "").trim())) {
    throw new HttpError(400, "Lütfen tüm zorunlu alanları doldurun.");
  }

  await assertNationalId(req.body);

  // Email is intentionally not unique for admin-created customers: the same
  // address may belong to several customer records.
  const passwordHash = await hashPassword(password || "Rentwin123.");

  const data = {
    firstName: firstName || "",
    lastName: lastName || "",
    email,
    phoneNumber: phoneNumber || "",
    address: address || "",
    zipCode: zipCode ? String(zipCode) : "",
    passwordHash,
    roles: Array.isArray(roles) && roles.length ? roles : ["Customer"],
    builtIn: false,
  };
  applyCustomerFields(req.body, data);

  // Customer code is always auto-assigned; ignore any value sent by the client.
  // Retry on the rare race where two customers are created at the same instant.
  let user;
  for (let attempt = 0; ; attempt += 1) {
    data.customerCode = await nextCustomerCode();
    try {
      user = await prisma.user.create({ data });
      break;
    } catch (err) {
      const dupCode = err.code === "P2002" && String(err.meta?.target ?? "").includes("customerCode");
      if (dupCode && attempt < 5) continue;
      throw err;
    }
  }
  res.status(201).json(serializeUser(user));
});

const updateUserAdmin = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "User not found.");
  if (target.builtIn) throw new HttpError(403, "This user cannot be modified.");

  const { firstName, lastName, email, phoneNumber, address, zipCode, roles, password } = req.body;

  if ("nationalId" in req.body || "customerType" in req.body) {
    await assertNationalId(
      { customerType: req.body.customerType ?? target.customerType, nationalId: req.body.nationalId ?? target.nationalId },
      target.id
    );
  }

  const data = {
    firstName, lastName, email, phoneNumber, address, roles,
    zipCode: zipCode == null ? "" : String(zipCode),
  };
  if (password) {
    data.passwordHash = await hashPassword(password);
  }
  applyCustomerFields(req.body, data);

  const user = await prisma.user.update({ where: { id: target.id }, data });
  res.json(serializeUser(user));
});

const deleteUserAdmin = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "User not found.");
  if (target.builtIn) throw new HttpError(403, "This user cannot be deleted.");

  await prisma.user.delete({ where: { id: target.id } });
  res.json({ message: "User deleted." });
});

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  getUserAdmin,
  getUsersByPageAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
};
