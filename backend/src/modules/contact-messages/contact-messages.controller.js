const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { parsePageParams, buildPageResponse } = require("../../lib/pagination");
const asyncHandler = require("../../middleware/async-handler");

const ALLOWED_SORT_FIELDS = ["id", "name", "email", "createdAt"];

const sendMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, body } = req.body;
  if (!name || !email || !subject || !body) {
    throw new HttpError(400, "Missing required fields.");
  }

  const message = await prisma.contactMessage.create({ data: { name, email, subject, body } });
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
