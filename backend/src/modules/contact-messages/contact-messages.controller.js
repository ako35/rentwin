const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "name", "email", "createdAt"];

// Public, unauthenticated form. Caps are well above what the site's own form
// allows (name 50, body 500), so they only stop scripted junk.
const CONTACT_LIMITS = { name: 100, email: 254, phone: 30, subject: 200, body: 2000 };

const sendMessage = asyncHandler(async (req, res) => {
  const fields = {};
  for (const [key, max] of Object.entries(CONTACT_LIMITS)) {
    const value = req.body?.[key];
    if (value != null && typeof value !== "string") {
      throw new HttpError(400, "Geçersiz form alanı.");
    }
    const trimmed = (value || "").trim();
    if (trimmed.length > max) {
      throw new HttpError(400, "Mesaj alanlarından biri çok uzun.");
    }
    fields[key] = trimmed;
  }
  const { name, email, phone, subject, body } = fields;
  if (!name || !email || !subject || !body) {
    throw new HttpError(400, "Missing required fields.");
  }

  const message = await prisma.contactMessage.create({
    data: { name, email, phone: phone || null, subject, body },
  });
  res.status(201).json(message);
});

const getMessagesByPage = asyncHandler(async (req, res) => {
  const { page, size, direction, sortField } = parsePageParams(req.query, {
    defaultSize: 20,
    allowedSortFields: ALLOWED_SORT_FIELDS,
  });

  const [content, totalElements] = await Promise.all([
    prisma.contactMessage.findMany({
      skip: page * size,
      take: size,
      orderBy: { [sortField]: direction },
    }),
    prisma.contactMessage.count(),
  ]);

  res.json(buildPageResponse({ content, totalElements, page, size, sortField }));
});

const getMessage = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
  if (!message) throw new HttpError(404, "Message not found.");
  res.json(message);
});

const deleteMessage = asyncHandler(async (req, res) => {
  const message = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
  if (!message) throw new HttpError(404, "Message not found.");

  await prisma.contactMessage.delete({ where: { id: message.id } });
  res.json({ message: "Message deleted." });
});

module.exports = { sendMessage, getMessagesByPage, getMessage, deleteMessage };
