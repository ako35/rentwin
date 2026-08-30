import moment from "moment/moment";
import { constants } from "../../constants";

// LOGIN FORM
export const loginFormInitialValues = {
    email: "",
    password: "",
};

// REGISTER FORM
export const registerFormInitialValues = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    address: "",
    zipCode: ""
};

// CONTACT FORM
export const contactFormInitialValues = {
    name: "",
    subject: "",
    body: "",
    email: "",
};

// HOMEPAGE RESERVATION SEARCH
export const reservationSearchInitialValues = () => ({
    location: "",
    pickUpDate: moment().format("YYYY-MM-DD"),
    pickUpTime: "10:00",
    dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
    dropOffTime: "10:00",
});

// BOOKING FORM
export const bookingFormInitialValues = {
    pickUpLocation: "",
    dropOffLocation: "",
    pickUpDate: "",
    dropOffDate: "",
    pickUpTime: "",
    dropOffTime: "",
    cardNo: "",
    cardHolderName: "",
    expiryDate: "",
    cvv: "",
    terms: false,
};

/////////////// USER INITIAL VALUES ///////////////

// PASSWORD FORM
export const userPasswordFormInitialValues = {
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
};

/////////////// ADMIN INITIAL VALUES ///////////////

// NEW VEHICLE FORM
export const adminNewVehicleFormInitialValues = {
    brand: "",
    model: "",
    licensePlate: "",
    doors: "",
    seats: "",
    luggage: "",
    transmission: constants.transmissionTypes[0].value,
    airConditioning: constants.airConditioningTypes[0].value,
    fuelType: constants.fuelTypes[0].value,
    age: "",
    pricePerHour: "",
    outOfService: false,
    branchId: "",
    nextMaintenanceDate: "",
    nextInspectionDate: "",
    modelYear: "",
    chassisNo: "",
    engineNo: "",
    currentKm: "",
    registrationSerialNo: "",
    registrationDate: "",
    ownershipType: "",
    color: "",
    notes: "",
    image: "",
};

// VEHICLE SUB-RECORD FORMS (insurance / tax / maintenance / inspection)
export const vehicleInsuranceInitialValues = {
    type: constants.insuranceTypes[0].value,
    company: "",
    policyNo: "",
    startDate: "",
    endDate: "",
    premium: "",
    notes: "",
};

export const vehicleTaxInitialValues = {
    period: new Date().getFullYear(),
    installment: constants.taxInstallments[0].value,
    amount: "",
    dueDate: "",
    paidDate: "",
    notes: "",
};

export const vehicleMaintenanceInitialValues = {
    type: constants.maintenanceTypes[0].value,
    date: "",
    odometer: "",
    vendor: "",
    description: "",
    cost: "",
    nextDate: "",
    nextOdometer: "",
};

export const vehicleInspectionInitialValues = {
    type: constants.inspectionTypes[0].value,
    date: "",
    result: constants.inspectionResults[0].value,
    expiryDate: "",
    station: "",
    cost: "",
    notes: "",
};
