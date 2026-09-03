const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { hashPassword, comparePassword } = require("../../lib/password");
const { serializeUser } = require("../../lib/serializers");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "firstName", "lastName", "email", "createdAt"];

const CUSTOMER_STRING_FIELDS = ["customerCode", "companyTitle", "taxOffice", "nationalId", "notes"];

const applyCustomerFields = (body, data) => {
  CUSTOMER_STRING_FIELDS.forEach((f) => {
    if (f in body) data[f] = body[f] === "" ? null : body[f];
  });
  if ("active" in body) data.active = Boolean(body.active);
  if ("customerType" in body) {
    data.customerType = body.customerType === "Kurumsal" ? "Kurumsal" : "Bireysel";
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
  const { firstName, lastName, email, phoneNumber, address, zipCode, roles, password, customerType, companyTitle } = req.body;

  const isCorporate = customerType === "Kurumsal";
  if (!email || (isCorporate ? !companyTitle : !firstName || !lastName)) {
    throw new HttpError(400, isCorporate
      ? "Company title and email are required."
      : "First name, last name and email are required.");
  }

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

  const user = await prisma.user.create({ data });
  res.status(201).json(serializeUser(user));
});

const updateUserAdmin = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw new HttpError(404, "User not found.");
  if (target.builtIn) throw new HttpError(403, "This user cannot be modified.");

  const { firstName, lastName, email, phoneNumber, address, zipCode, roles, password } = req.body;

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
