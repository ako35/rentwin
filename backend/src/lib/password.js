const bcrypt = require("bcryptjs");
const HttpError = require("./http-error");

const SALT_ROUNDS = 10;
const MIN_LENGTH = 8;

// Password a customer added from the admin panel gets when none is typed in.
// The office gives it to customers so they can log in to the site; keeping it
// was the owner's decision (Nov 2026), knowing it is readable in the public
// repository.
const DEFAULT_CUSTOMER_PASSWORD = "Rentwin123.";

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// Throws a 400 the forms can show when a password someone chose is too short.
const assertUsablePassword = (plain) => {
  if (!plain || String(plain).length < MIN_LENGTH) {
    throw new HttpError(400, "Şifre en az 8 karakter olmalıdır.");
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  assertUsablePassword,
  DEFAULT_CUSTOMER_PASSWORD,
};
