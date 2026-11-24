// Outgoing e-mail over SMTP (nodemailer). Used for GPS alerts
// (modules/telematics/telematics.alerts.js); anything else can reuse it.
//
// Env (all on Vercel, never in the repo):
//   SMTP_HOST    e.g. mail.example.com
//   SMTP_PORT    587 (STARTTLS, default) or 465 (implicit TLS)
//   SMTP_SECURE  "true" for port 465; defaults to true only when the port is 465
//   SMTP_USER    mailbox login
//   SMTP_PASS    mailbox password / app password
//   MAIL_FROM    sender shown to recipients, e.g. "Rentwin GPS <bildirim@rentwin.com.tr>"
//                (defaults to SMTP_USER)
//
// While SMTP_HOST/SMTP_USER/SMTP_PASS are unset, isConfigured() is false and
// callers skip sending: alerts still show in the admin panel.

let transporter = null;

const config = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = (process.env.SMTP_SECURE || "").trim().toLowerCase();
  return {
    host: (process.env.SMTP_HOST || "").trim(),
    port,
    secure: secureEnv ? secureEnv === "true" : port === 465,
    user: (process.env.SMTP_USER || "").trim(),
    pass: process.env.SMTP_PASS || "",
    from: (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim(),
  };
};

const isConfigured = () => {
  const c = config();
  return !!(c.host && c.user && c.pass);
};

const getTransporter = () => {
  if (transporter) return transporter;
  const c = config();
  // Required lazily: most requests never send mail.
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporter;
};

// Comma/semicolon/whitespace separated list -> unique, plausible addresses.
const parseRecipients = (value) =>
  [
    ...new Set(
      String(value || "")
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s))
    ),
  ];

const sendMail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    const err = new Error("SMTP is not configured.");
    err.code = "MAIL_NOT_CONFIGURED";
    throw err;
  }
  const recipients = Array.isArray(to) ? to : parseRecipients(to);
  if (!recipients.length) {
    const err = new Error("No recipients.");
    err.code = "MAIL_NO_RECIPIENTS";
    throw err;
  }
  return getTransporter().sendMail({ from: config().from, to: recipients.join(", "), subject, text, html });
};

module.exports = { isConfigured, parseRecipients, sendMail };
