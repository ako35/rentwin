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
  bookingFormInitialValues,
  contactFormInitialValues,
  userPasswordFormInitialValues,
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
  bookingFormValidationSchema,
  contactFormValidationSchema,
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
    bookingFormInitialValues,
    contactFormInitialValues,
    userPasswordFormInitialValues,
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
    bookingFormValidationSchema,
    contactFormValidationSchema,
    userPasswordFormValidationSchema,
    userProfileFormValidationSchema,
  },
};
