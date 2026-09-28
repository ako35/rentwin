// The guided capture sequence — fixed required shots (one each) plus an
// open-ended "hasar" slot the operator can shoot as many times as needed.
// Purely a client-side UI convention: the backend accepts any (stage, angle)
// combination any number of times (see contract-photos.controller.js), so
// this list is the only thing enforcing "6 photos" structure.
export const REQUIRED_ANGLES = [
  { angle: "FRONT", label: "Ön" },
  { angle: "BACK", label: "Arka" },
  { angle: "LEFT", label: "Sol Yan" },
  { angle: "RIGHT", label: "Sağ Yan" },
  { angle: "DASHBOARD", label: "Km & Yakıt Göstergesi" },
];

// Not part of the required count — shot zero or more times.
export const DAMAGE_ANGLE = "DAMAGE";

export const STAGE_LABEL = { PICKUP: "Teslim", RETURN: "İade" };
