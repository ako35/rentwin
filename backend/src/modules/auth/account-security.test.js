// Account security: passwords, tokens after a password change, what a user
// sees about their own account, and the public contact form's limits.
// Run: node --test src/modules/auth/account-security.test.js
//
// Same approach as the other handler tests: the real handlers run against an
// in-memory Prisma stand-in injected through require.cache.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret";

let users;
let messages;
let nextId;
const resetDb = () => {
  users = [];
  messages = [];
  nextId = 1;
};
resetDb();

const copy = (row) => (row ? { ...row } : null);

const fakePrisma = {
  user: {
    findUnique: async ({ where }) => copy(users.find((u) => u.id === where.id)),
    // Email lookups (register); customer code / national id clash checks find nothing.
    findFirst: async ({ where }) => (where.email ? copy(users.find((u) => u.email === where.email)) : null),
    findMany: async ({ where }) => users.filter((u) => u.email === where.email).map(copy),
    create: async ({ data }) => {
      const row = { id: `user-${nextId++}`, createdAt: new Date(), updatedAt: new Date(), ...data };
      users.push(row);
      return copy(row);
    },
    update: async ({ where, data }) => {
      const row = users.find((u) => u.id === where.id);
      for (const [key, value] of Object.entries(data)) if (value !== undefined) row[key] = value;
      return copy(row);
    },
  },
  contactMessage: {
    create: async ({ data }) => {
      const row = { id: `msg-${nextId++}`, ...data };
      messages.push(row);
      return row;
    },
  },
};

const prismaPath = path.resolve(__dirname, "../../lib/prisma.js");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword, DEFAULT_CUSTOMER_PASSWORD } = require("../../lib/password");
const { SELF_USER_FIELDS } = require("../../lib/serializers");
const auth = require("./auth.controller");
const usersController = require("../users/users.controller");
const contact = require("../contact-messages/contact-messages.controller");
const authenticate = require("../../middleware/authenticate");

// Runs an asyncHandler-wrapped Express handler; resolves with what it sent
// (or { next: true } when it called next()), rejects with a passed error.
const call = (handler, req = {}) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
        return this;
      },
    };
    const fullReq = { params: {}, query: {}, body: {}, headers: {}, ...req };
    handler(fullReq, res, (err) => (err ? reject(err) : resolve({ next: true, req: fullReq })));
  });

const addUser = async (fields, password) => {
  const row = {
    id: `user-${nextId++}`,
    firstName: "Ayşe",
    lastName: "Yılmaz",
    email: "ayse@example.test",
    phoneNumber: "05550000000",
    address: "Aliağa",
    zipCode: "35800",
    roles: ["Customer"],
    builtIn: false,
    customerType: "Bireysel",
    customerCode: "M00001",
    nationalId: "12345678901",
    active: true,
    notes: "İç not: depozito al",
    googleReviewRequestedAt: new Date("2026-10-01"),
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
  };
  users.push(row);
  return row;
};

const rejectsWithStatus = (promise, status) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.status, status);
    return true;
  });

test("a customer added at the counter can log in with the office's default password", async () => {
  resetDb();
  const { status } = await call(usersController.createUserAdmin, {
    user: { id: "admin", roles: ["Administrator"] },
    body: { firstName: "Mehmet", lastName: "Kaya", email: "mehmet@example.test", nationalId: "10987654321" },
  });
  assert.equal(status, 201);
  const created = users.find((u) => u.email === "mehmet@example.test");
  assert.equal(await comparePassword(DEFAULT_CUSTOMER_PASSWORD, created.passwordHash), true);

  const login = await call(auth.login, {
    body: { email: "mehmet@example.test", password: DEFAULT_CUSTOMER_PASSWORD },
  });
  assert.ok(login.body.token);
});

test("a password someone types in must be at least 8 characters", async () => {
  resetDb();
  const user = await addUser({}, "kendi-sifrem-1");
  await rejectsWithStatus(
    call(usersController.changePassword, {
      user: { id: user.id },
      body: { oldPassword: "kendi-sifrem-1", newPassword: "kisa" },
    }),
    400
  );
  await rejectsWithStatus(
    call(usersController.createUserAdmin, {
      user: { id: "admin", roles: ["Administrator"] },
      body: { firstName: "Y", lastName: "Z", email: "y@example.test", roles: ["Administrator"], password: "kisa" },
    }),
    400
  );
});

test("a token stops working once the password changes", async () => {
  resetDb();
  const user = await addUser({ email: "token@example.test" }, "ilk-sifre-123");
  const { body } = await call(auth.login, { body: { email: "token@example.test", password: "ilk-sifre-123" } });
  const headers = { authorization: `Bearer ${body.token}` };

  const before = await call(authenticate, { headers });
  assert.equal(before.next, true);
  assert.equal(before.req.user.id, user.id);
  assert.equal("passwordHash" in before.req.user, false);

  await call(usersController.changePassword, {
    user: { id: user.id },
    body: { oldPassword: "ilk-sifre-123", newPassword: "ikinci-sifre-456" },
  });

  const after = await call(authenticate, { headers });
  assert.equal(after.status, 401);
});

test("a token from before the password stamp keeps working until it expires", async () => {
  resetDb();
  const user = await addUser({}, "bir-sifre-789");
  const legacy = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  const result = await call(authenticate, { headers: { authorization: `Bearer ${legacy}` } });
  assert.equal(result.next, true);
  assert.equal(result.req.user.id, user.id);
});

test("a token with someone else's stamp is refused", async () => {
  resetDb();
  const user = await addUser({}, "bir-sifre-789");
  const forged = jwt.sign({ sub: user.id, pwd: "not-the-stamp" }, process.env.JWT_SECRET, { expiresIn: "7d" });
  const result = await call(authenticate, { headers: { authorization: `Bearer ${forged}` } });
  assert.equal(result.status, 401);
});

test("GET /user shows the customer only their own allow-listed fields", async () => {
  resetDb();
  const user = await addUser({}, "bir-sifre-789");
  const { passwordHash, ...reqUser } = user;
  const { body } = await call(usersController.getCurrentUser, { user: reqUser });
  for (const hidden of ["notes", "googleReviewRequestedAt", "active", "passwordHash"]) {
    assert.equal(hidden in body, false, `GET /user exposes ${hidden}`);
  }
  for (const key of Object.keys(body)) assert.ok(SELF_USER_FIELDS.includes(key), `unexpected field ${key}`);
  assert.equal(body.firstName, "Ayşe");
  assert.deepEqual(body.roles, ["Customer"]);
  assert.equal(body.builtIn, false);
});

test("PUT /user keeps fields that weren't sent and never stores 'undefined'", async () => {
  resetDb();
  const user = await addUser({}, "bir-sifre-789");
  const { body } = await call(usersController.updateCurrentUser, {
    user: { id: user.id },
    body: { firstName: " Ayşe Nur ", lastName: "Yılmaz", email: "ayse@example.test" },
  });
  assert.equal(body.firstName, "Ayşe Nur");
  assert.equal(body.zipCode, "35800");
  assert.equal("notes" in body, false);
  assert.equal(users[0].zipCode, "35800");

  await rejectsWithStatus(
    call(usersController.updateCurrentUser, { user: { id: user.id }, body: { firstName: "  " } }),
    400
  );
});

test("the public contact form rejects oversized or non-text fields", async () => {
  resetDb();
  const ok = await call(contact.sendMessage, {
    body: { name: "Ali", email: "ali@example.test", subject: "Fiyat", body: "Merhaba, haftalık fiyat almak istiyorum." },
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.phone, null);

  await rejectsWithStatus(
    call(contact.sendMessage, {
      body: { name: "Ali", email: "ali@example.test", subject: "Fiyat", body: "x".repeat(2001) },
    }),
    400
  );
  await rejectsWithStatus(
    call(contact.sendMessage, {
      body: { name: { $gt: "" }, email: "ali@example.test", subject: "Fiyat", body: "Merhaba" },
    }),
    400
  );
  assert.equal(messages.length, 1);
});
