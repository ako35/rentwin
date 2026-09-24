// Rentwin backend -> bu servis çağrılarını doğrular. Tarayıcıdan değil,
// sunucudan sunucuya (Vercel -> VPS) çağrıldığı için basit bir paylaşılan
// sır (shared secret) yeterli; ileride mTLS'e geçilebilir.
const requireSharedSecret = (req, res, next) => {
  const expected = process.env.KABIS_PROXY_SHARED_SECRET;
  if (!expected) {
    return res.status(500).json({ error: "KABIS_PROXY_SHARED_SECRET tanımlı değil (.env)." });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token !== expected) {
    return res.status(401).json({ error: "Yetkisiz." });
  }

  next();
};

module.exports = { requireSharedSecret };
