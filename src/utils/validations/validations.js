import * as Yup from 'yup';
import i18n from '../../i18n';

const t = (key) => () => i18n.t(key, { ns: 'validation' });

// login form
export const loginFormValidationSchema = Yup.object({
    email: Yup.string().email(t('login.emailInvalid')).required(t('login.emailRequired')),
    password: Yup.string().required(t('login.passwordRequired')),
})

// register form
export const registerFormValidationSchema = Yup.object({
    firstName: Yup.string()
        .min(2, t("register.firstNameMin"))
        .max(50, t("register.firstNameMax"))
        .required(t("register.firstNameRequired")),
    lastName: Yup.string()
        .min(2, t("register.lastNameMin"))
        .max(50, t("register.lastNameMax"))
        .required(t("register.lastNameRequired")),
    email: Yup.string()
        .email(t("register.emailInvalid"))
        .required(t("register.emailRequired")),
    password: Yup.string()
        .min(8, t("register.passwordMin"))
        .max(50, t("register.passwordMax"))
        .matches(/[a-z]+/, t("register.passwordLower"))
        .matches(/[A-Z]+/, t("register.passwordUpper"))
        .matches(/\d+/, t("register.passwordNumber"))
        .matches(/[@$!%*#?&.]+/, t("register.passwordSpecial"))
        .required(t("register.passwordRequired")),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], t("register.confirmPasswordMatch"))
        .required(t("register.confirmPasswordRequired")),
    phoneNumber: Yup.string()
        .matches(/^[\d\s()/-]+$/, t("register.phoneInvalid"))
        .min(14, t("register.phoneMin"))
        .max(14, t("register.phoneMax"))
        .required(t("register.phoneRequired")),
    address: Yup.string()
        .min(5, t("register.addressMin"))
        .max(50, t("register.addressMax"))
        .required(t("register.addressRequired")),
    zipCode: Yup.string()
        .min(4, t("register.zipMin"))
        .max(6, t("register.zipMax"))
        .required(t("register.zipRequired")),
})

// CONTACT FORM
export const contactFormValidationSchema = Yup.object({
    name: Yup.string()
        .min(2, t("contact.nameMin"))
        .max(50, t("contact.nameMax"))
        .required(t("contact.nameRequired")),
    subject: Yup.string()
        .min(5, t("contact.subjectMin"))
        .max(50, t("contact.subjectMax"))
        .required(t("contact.subjectRequired")),
    body: Yup.string()
        .min(20, t("contact.bodyMin"))
        .max(200, t("contact.bodyMax"))
        .required(t("contact.bodyRequired")),
    email: Yup.string()
        .email(t("contact.emailInvalid"))
        .required(t("contact.emailRequired")),
});

// HOMEPAGE RESERVATION SEARCH
const tSearch = (key) => () => i18n.t(`reservationSearch.${key}`, { ns: "validation" });

export const reservationSearchValidationSchema = Yup.object({
    location: Yup.string().trim().required(tSearch("locationRequired")),
    pickUpDate: Yup.string().required(tSearch("pickUpDateRequired")),
    pickUpTime: Yup.string().required(tSearch("pickUpTimeRequired")),
    dropOffDate: Yup.string().required(tSearch("dropOffDateRequired")),
    dropOffTime: Yup.string()
        .required(tSearch("dropOffTimeRequired"))
        .test("after-pickup", tSearch("dropOffAfterPickUp"), function () {
            const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = this.parent;
            if (!pickUpDate || !pickUpTime || !dropOffDate || !dropOffTime) return true;
            return new Date(`${dropOffDate}T${dropOffTime}`) > new Date(`${pickUpDate}T${pickUpTime}`);
        }),
});

// BOOKING FORM
export const bookingFormValidationSchema = Yup.object({
    pickUpLocation: Yup.string().required(t("booking.pickUpLocationRequired")),
    dropOffLocation: Yup.string().required(t("booking.dropOffLocationRequired")),
    pickUpDate: Yup.date().required(t("booking.pickUpDateRequired")),
    pickUpTime: Yup.string().required(t("booking.pickUpTimeRequired")),
    dropOffDate: Yup.date().required(t("booking.dropOffDateRequired")),
    dropOffTime: Yup.string().required(t("booking.dropOffTimeRequired")),
    cardNo: Yup.string()
        .min(15, t("booking.cardNoMin"))
        .required(t("booking.cardNoRequired")),
    cardHolderName: Yup.string().required(t("booking.cardHolderNameRequired")),
    expiryDate: Yup.date().required(t("booking.expiryDateRequired")),
    cvv: Yup.number()
        .typeError(t("booking.cvvType"))
        .min(1)
        .max(999)
        .required(t("booking.cvvRequired")),
    terms: Yup.bool().oneOf([true], t("booking.termsRequired"))
});

/////////////// USER VALIDATIONS ///////////////

// PROFILE FORM
export const userProfileFormValidationSchema = Yup.object({
    firstName: Yup.string()
        .min(2, t("userProfile.firstNameMin"))
        .max(50, t("userProfile.firstNameMax"))
        .required(t("userProfile.firstNameRequired")),
    lastName: Yup.string()
        .min(2, t("userProfile.lastNameMin"))
        .max(50, t("userProfile.lastNameMax"))
        .required(t("userProfile.lastNameRequired")),
    email: Yup.string()
        .email(t("userProfile.emailInvalid"))
        .required(t("userProfile.emailRequired")),
    phoneNumber: Yup.string()
        .required(t("userProfile.phoneRequired")),
    address: Yup.string()
        .min(5, t("userProfile.addressMin"))
        .max(50, t("userProfile.addressMax"))
        .required(t("userProfile.addressRequired")),
    zipCode: Yup.string()
        .matches(/^[0-9]+$/, t("userProfile.zipDigitsOnly"))
        .min(4, t("userProfile.zipMin"))
        .max(6, t("userProfile.zipMax"))
        .required(t("userProfile.zipRequired")),
});

// PASSWORD FORM
export const userPasswordFormValidationSchema = Yup.object({
    oldPassword: Yup.string()
        .required(t("userPassword.oldPasswordRequired")),
    newPassword: Yup.string()
        .min(8, t("userPassword.newPasswordMin"))
        .matches(/[a-z]+/, t("userPassword.newPasswordLower"))
        .matches(/[A-Z]+/, t("userPassword.newPasswordUpper"))
        .matches(/\d+/, t("userPassword.newPasswordNumber"))
        .matches(/[@$!%*#?&.]+/, t("userPassword.newPasswordSpecial"))
        .required(t("userPassword.newPasswordRequired")),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword"), null], t("userPassword.confirmPasswordMatch"))
        .required(t("userPassword.confirmPasswordRequired")),
});


/////////////// ADMIN VALIDATIONS ///////////////

// Customer record (individual or corporate). Only identity + email are hard
// requirements — a walk-in customer often has no full address on file.
export const adminUserDetailsFormValidationSchema = Yup.object({
    customerType: Yup.string().oneOf(["Bireysel", "Kurumsal"]),
    email: Yup.string()
        .email(t("adminUser.emailInvalid"))
        .required(t("adminUser.emailRequired")),
    companyTitle: Yup.string().when("customerType", {
        is: "Kurumsal",
        then: (s) => s.trim().required(t("adminUser.companyTitleRequired")),
        otherwise: (s) => s.nullable(),
    }),
    firstName: Yup.string().when("customerType", {
        is: "Kurumsal",
        then: (s) => s.nullable(),
        otherwise: (s) => s.trim().required(t("adminUser.firstNameRequired")),
    }),
    lastName: Yup.string().when("customerType", {
        is: "Kurumsal",
        then: (s) => s.nullable(),
        otherwise: (s) => s.trim().required(t("adminUser.lastNameRequired")),
    }),
    nationalId: Yup.string().when("customerType", {
        is: "Kurumsal",
        then: (s) => s.matches(/^\d{10}$/, t("adminUser.taxNoInvalid")).required(t("adminUser.taxNoRequired")),
        otherwise: (s) => s.matches(/^\d{11}$/, t("adminUser.tcInvalid")).required(t("adminUser.tcRequired")),
    }),
});

// ADMIN CONTRACT DETAIL FORM
export const adminReservationDetailsFormValidationSchema = Yup.object({
    pickUpLocation: Yup.string().required(t("adminReservation.pickUpLocationRequired")),
    dropOffLocation: Yup.string().required(t("adminReservation.dropOffLocationRequired")),
    pickUpDate: Yup.string().required(t("adminReservation.pickUpDateRequired")),
    pickUpTime: Yup.string().required(t("adminReservation.pickUpTimeRequired")),
    dropOffDate: Yup.string().required(t("adminReservation.dropOffDateRequired")),
    dropOffTime: Yup.string().required(t("adminReservation.dropOffTimeRequired")),
    carId: Yup.string().required(t("adminReservation.carRequired")),
    userId: Yup.string().required(t("adminReservation.customerRequired")),
    status: Yup.string().required(t("adminReservation.statusRequired")),
});

// ADMIN RESERVATION (BOOKING) FORM
export const adminReservationBookingValidationSchema = Yup.object({
    pickUpLocation: Yup.string().required(t("adminReservation.pickUpLocationRequired")),
    pickUpDate: Yup.string().required(t("adminReservation.pickUpDateRequired")),
    pickUpTime: Yup.string().required(t("adminReservation.pickUpTimeRequired")),
    dropOffDate: Yup.string().required(t("adminReservation.dropOffDateRequired")),
    dropOffTime: Yup.string().required(t("adminReservation.dropOffTimeRequired")),
    carId: Yup.string().required(t("adminReservation.carRequired")),
});

// VEHICLE SUB-RECORD FORMS (insurance / tax / maintenance / inspection)
const tRec = (key) => () => i18n.t(`vehicleRecords.${key}`, { ns: "validation" });

const optionalNumber = () =>
    Yup.number()
        .transform((value, original) => (original === "" || original === null ? undefined : value))
        .typeError(tRec("numberInvalid"))
        .min(0, tRec("numberMin"))
        .nullable();

const optionalDate = () =>
    Yup.date()
        .transform((value, original) => (original === "" || original === null ? undefined : value))
        .typeError(tRec("dateInvalid"))
        .nullable();

export const vehicleInsuranceValidationSchema = Yup.object({
    type: Yup.string().required(tRec("required")),
    company: Yup.string().trim().required(tRec("required")),
    policyNo: Yup.string().trim().required(tRec("required")),
    startDate: Yup.date().typeError(tRec("dateInvalid")).required(tRec("required")),
    endDate: Yup.date()
        .typeError(tRec("dateInvalid"))
        .min(Yup.ref("startDate"), tRec("endAfterStart"))
        .required(tRec("required")),
    premium: optionalNumber(),
    notes: Yup.string(),
});

export const vehicleTaxValidationSchema = Yup.object({
    period: Yup.number()
        .typeError(tRec("numberInvalid"))
        .integer(tRec("numberInvalid"))
        .min(1900, tRec("numberInvalid"))
        .max(2999, tRec("numberInvalid"))
        .required(tRec("required")),
    installment: Yup.number().oneOf([1, 2], tRec("required")).required(tRec("required")),
    amount: Yup.number().typeError(tRec("numberInvalid")).min(0, tRec("numberMin")).required(tRec("required")),
    dueDate: optionalDate(),
    paidDate: optionalDate(),
    notes: Yup.string(),
});

export const vehicleMaintenanceValidationSchema = Yup.object({
    type: Yup.string().required(tRec("required")),
    date: Yup.date().typeError(tRec("dateInvalid")).required(tRec("required")),
    odometer: optionalNumber(),
    vendor: Yup.string(),
    description: Yup.string().trim().required(tRec("required")),
    cost: optionalNumber(),
    nextDate: optionalDate(),
    nextOdometer: optionalNumber(),
});

export const vehicleInspectionValidationSchema = Yup.object({
    type: Yup.string().required(tRec("required")),
    date: Yup.date().typeError(tRec("dateInvalid")).required(tRec("required")),
    result: Yup.string().required(tRec("required")),
    expiryDate: optionalDate(),
    station: Yup.string(),
    cost: optionalNumber(),
    notes: Yup.string(),
});

// ADMIN VEHICLE FORM
export const adminVehicleFormValidationSchema = Yup.object({
    brand: Yup.string()
        .required(t("adminVehicle.brandRequired")),
    model: Yup.string()
        .required(t("adminVehicle.modelRequired")),
    licensePlate: Yup.string()
        .required(t("adminVehicle.licensePlateRequired")),
    transmission: Yup.string()
        .required(t("adminVehicle.transmissionRequired")),
    fuelType: Yup.string()
        .required(t("adminVehicle.fuelTypeRequired")),
    image: Yup.mixed().required(t("adminVehicle.imageRequired"))
});
