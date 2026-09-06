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