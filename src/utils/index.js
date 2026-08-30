// FUNCTIONS
import {
  swalQuestion,
  swalToast,
  validCheck,
  checkDates,
  checkExpireDate,
  combineDateAndTime,
  formatDateTime,
  getCurrentDate,
  getDate,
  getTime,
} from "./functions/functions";

// INITIAL VALUES
import {
  loginFormInitialValues,
  registerFormInitialValues,
  adminNewVehicleFormInitialValues,
  reservationSearchInitialValues,
  bookingFormInitialValues,
  contactFormInitialValues,
  userPasswordFormInitialValues,
  vehicleInsuranceInitialValues,
  vehicleTaxInitialValues,
  vehicleMaintenanceInitialValues,
  vehicleInspectionInitialValues,
} from "./initial-values/initial-values";

// TABLES
import {
  getAdminUserColumns,
  getAdminReservationsColumns,
  getAdminContactMessagesColumns,
  getAdminVehiclesColumns,
} from "./tables/tables";

// VALIDATIONS
import {
  loginFormValidationSchema,
  registerFormValidationSchema,
  userPasswordFormValidationSchema,
  adminReservationDetailsFormValidationSchema,
  adminVehicleFormValidationSchema,
  userProfileFormValidationSchema,
  adminUserDetailsFormValidationSchema,
  reservationSearchValidationSchema,
  bookingFormValidationSchema,
  contactFormValidationSchema,
  vehicleInsuranceValidationSchema,
  vehicleTaxValidationSchema,
  vehicleMaintenanceValidationSchema,
  vehicleInspectionValidationSchema,
} from "./validations/validations";

export const utils = {
  functions: {
    validCheck,
    swalQuestion,
    swalToast,
    checkDates,
    checkExpireDate,
    combineDateAndTime,
    formatDateTime,
    getCurrentDate,
    getDate,
    getTime,
  },
  initialValues: {
    loginFormInitialValues,
    registerFormInitialValues,
    adminNewVehicleFormInitialValues,
    reservationSearchInitialValues,
    bookingFormInitialValues,
    contactFormInitialValues,
    userPasswordFormInitialValues,
    vehicleInsuranceInitialValues,
    vehicleTaxInitialValues,
    vehicleMaintenanceInitialValues,
    vehicleInspectionInitialValues,
  },
  tables: {
    getAdminUserColumns,
    getAdminReservationsColumns,
    getAdminContactMessagesColumns,
    getAdminVehiclesColumns,
  },
  validations: {
    loginFormValidationSchema,
    registerFormValidationSchema,
    adminReservationDetailsFormValidationSchema,
    adminUserDetailsFormValidationSchema,
    adminVehicleFormValidationSchema,
    reservationSearchValidationSchema,
    bookingFormValidationSchema,
    contactFormValidationSchema,
    userPasswordFormValidationSchema,
    userProfileFormValidationSchema,
    vehicleInsuranceValidationSchema,
    vehicleTaxValidationSchema,
    vehicleMaintenanceValidationSchema,
    vehicleInspectionValidationSchema,
  },
};
