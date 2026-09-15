// No-CSS build: SweetAlert2's own styles are compiled from SCSS in
// src/styles/styles.scss with our brand variables. The default "sweetalert2"
// entry injects its own (purple) stylesheet at runtime and would override them.
import Swal from "sweetalert2/dist/sweetalert2.js"
import moment from "moment/moment"
import i18n from "../../i18n"

// SweetAlert2 button labels — localized (common:swal.*) with a literal fallback
// so a missing key never leaks "swal.confirm" into a live dialog.
const swalLabel = (key, fallback) =>
    i18n.exists(`common:swal.${key}`) ? i18n.t(`common:swal.${key}`) : fallback

// FORM CHECK FUNCTION
export const validCheck = (field, obj) => {
    const myObject = {
        isValid: obj.touched[field] && !obj.errors[field],
        isInvalid: obj.touched[field] && obj.errors[field],
    }

    return myObject
}

// SWEET ALERT FUNCTION
// options.danger  -> destructive confirm: amber "!" icon, rose confirm button,
//                    focus starts on Cancel. Pass { danger: true } from any
//                    delete handler. Non-destructive confirms (logout, status
//                    change) keep the green "?" default.
export const swalQuestion = (title, text, options = {}) => {
    const { danger = false, confirmText, cancelText } = options
    return Swal.fire({
        title: title,
        text: text,
        icon: danger ? 'warning' : 'question',
        showCancelButton: true,
        reverseButtons: true,
        focusCancel: danger,
        confirmButtonText: confirmText || swalLabel(danger ? 'delete' : 'confirm', danger ? 'Sil' : 'Onayla'),
        cancelButtonText: cancelText || swalLabel('cancel', 'Vazgeç'),
        customClass: danger ? { confirmButton: 'swal2-confirm--danger' } : undefined,
    })
}

export const swalToast = (title, icon='info', timer=5000) => {
    return Swal.fire({
        title: title,
        icon: icon,
        timer: timer,
        showConfirmButton: true
    })
}

// COMBINE DATE AND TIME FUNCTIONS
export const combineDateAndTime = (date, time) => {
    return moment(`${date} ${time}`).format("MM/DD/YYYY HH:mm:ss");
}

// Shrink a photo before upload so it clears the serverless request-body cap
// (Vercel ~4.5 MB) and the multer limit — a phone snap of a belge is 3-8 MB but
// stays perfectly readable at ~2000 px / JPEG. PDFs and non-images pass through
// untouched; if anything fails, or the result isn't smaller, the original is
// returned so the upload still goes ahead.
export const downscaleImage = (file, { maxEdge = 2000, quality = 0.82 } = {}) =>
    new Promise((resolve) => {
        if (!file || !file.type?.startsWith("image/")) return resolve(file);
        // Already small enough to send as-is — skip decoding it (and creating an
        // object URL) entirely.
        if (file.size <= 1.5 * 1024 * 1024) return resolve(file);

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
            if (scale === 1) return resolve(file);

            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    if (!blob || blob.size >= file.size) return resolve(file);
                    const name = file.name.replace(/\.(png|webp|heic|heif|bmp|tiff?)$/i, ".jpg");
                    resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
                },
                "image/jpeg",
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });

// URL slug from a display name — Turkish letters folded to ASCII so the
// location SEO routes stay clean (Aliağa -> aliaga, İzmir -> izmir).
export const slugify = (value = "") => {
    const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", I: "i" };
    return value
        .toString()
        .trim()
        .replace(/[çğıöşüİI]/g, (c) => map[c] ?? c)
        .toLocaleLowerCase("en")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Every vehicle sharing a brand+model shows the same stock photo (see
// ModelImagePreview) regardless of its own "Renk" field — this gives that
// photo an approximate tint toward the vehicle's actual colour so it doesn't
// mislead (e.g. a grey Egea showing a white studio shot). Keyword match
// against common Turkish paint names; unrecognised/typo'd text returns null
// and the photo shows unfiltered rather than risk a wrong-looking tint. Not
// photo-realistic — just close enough to read as "this one's grey/red/...".
const NEUTRAL_COLOR_TINTS = [
    { keywords: ["beyaz", "white", "inci", "pearl"], filter: "saturate(0.15) brightness(1.08)" },
    { keywords: ["siyah", "black"], filter: "saturate(0.2) brightness(0.55) contrast(1.15)" },
    { keywords: ["gri", "gray", "grey", "antrasit", "füme", "fume"], filter: "saturate(0.15) brightness(0.85)" },
    { keywords: ["gümüş", "gumus", "silver"], filter: "saturate(0.1) brightness(1.02)" },
];

const HUE_COLOR_TINTS = [
    { keywords: ["kırmızı", "kirmizi", "red", "bordo"], color: "#c41e2a" },
    { keywords: ["mavi", "blue", "lacivert", "navy"], color: "#1f4fb0" },
    { keywords: ["yeşil", "yesil", "green"], color: "#1f7a3d" },
    { keywords: ["sarı", "sari", "yellow"], color: "#e6c619" },
    { keywords: ["turuncu", "orange"], color: "#e0721f" },
    { keywords: ["kahverengi", "kahve", "brown", "bej", "beige"], color: "#7a5230" },
    { keywords: ["mor", "purple", "eflatun"], color: "#6a2fa0" },
    { keywords: ["pembe", "pink"], color: "#d94f8f" },
    { keywords: ["altın", "altin", "gold"], color: "#c9a227" },
    { keywords: ["turkuaz", "turquoise"], color: "#1fa7a0" },
];

export const getVehicleColorTint = (colorText) => {
    const norm = (colorText || "").toString().trim().toLocaleLowerCase("tr");
    if (!norm) return null;

    const neutral = NEUTRAL_COLOR_TINTS.find((t) => t.keywords.some((k) => norm.includes(k)));
    if (neutral) return { type: "neutral", filter: neutral.filter };

    const hue = HUE_COLOR_TINTS.find((t) => t.keywords.some((k) => norm.includes(k)));
    if (hue) return { type: "hue", color: hue.color, opacity: 0.5, filter: "saturate(1.1)" };

    return null;
};

export const getCurrentDate = () => {
    return moment().format("YYYY-MM-DD");
}

export const checkDates = (dates) => {
    const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = dates;

    const pickUpDateTime = moment(`${pickUpDate} ${pickUpTime}`);
    const dropOffDateTime = moment(`${dropOffDate} ${dropOffTime}`);

    return dropOffDateTime > pickUpDateTime.add(1, "h");
}

export const checkExpireDate = (date) => {
    if (!date) return false;
    if (date.includes("_")) return false;

    const expireDate = moment(date, "MM/YY").add(1, "month").add(-1, "day");

    if (!expireDate.isValid()) return false;
    if (expireDate < moment()) return false;

    return true;
}

export const formatDateTime = (dateTime) => {
    return moment(dateTime).format("lll");
}

export const getDate = (dateTime) => {
    return moment(dateTime).format("YYYY-MM-DD")
}

export const getTime = (dateTime) => {
    return moment(dateTime).format("HH:mm")
} 