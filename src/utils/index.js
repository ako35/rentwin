// FUNCTIONS
import {
  swalQuestion,
  swalToast,
  validCheck,
  checkDates,
  checkExpireDate,
  combineDateAndTime,
  slugify,
  downscaleImage,
  formatDateTime,
  getCurrentDate,
  getDate,
  getTime,
  getDateUTC,
  getTimeUTC,
} from "./functions/functions";

// INITIAL VALUES
import {
  loginFormInitialValues,
  registerFormInitialValues,
  adminNewVehicleFormInitialValues,
  reservationSearchInitialValues,
  bookingFormInitialValues,
  contactFormInitialValues,
  reviewFormInitialValues,
  userPasswordFormInitialValues,
  vehicleInsuranceInitialValues,
  vehicleTaxInitialValues,
  vehicleMaintenanceInitialValues,
  vehicleInspectionInitialValues,
} from "./initial-values/initial-values";

// TABLES
import {
  getAdminReservationsColumns,
  getAdminContactMessagesColumns,
  getAdminVehiclesColumns,
} from "./tables/tables";
import { dataTableStyles } from "./tables/data-table-styles";

// VALIDATIONS
import {
  loginFormValidationSchema,
  registerFormValidationSchema,
  userPasswordFormValidationSchema,
  adminReservationDetailsFormValidationSchema,
  adminReservationBookingValidationSchema,
  adminVehicleFormValidationSchema,
  userProfileFormValidationSchema,
  adminUserDetailsFormValidationSchema,
  reservationSearchValidationSchema,
  bookingFormValidationSchema,
  contactFormValidationSchema,
  reviewFormValidationSchema,
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
    slugify,
    downscaleImage,
    formatDateTime,
    getCurrentDate,
    getDate,
    getTime,
    getDateUTC,
    getTimeUTC,
  },
  initialValues: {
    loginFormInitialValues,
    registerFormInitialValues,
    adminNewVehicleFormInitialValues,
    reservationSearchInitialValues,
    bookingFormInitialValues,
    contactFormInitialValues,
    reviewFormInitialValues,
    userPasswordFormInitialValues,
    vehicleInsuranceInitialValues,
    vehicleTaxInitialValues,
    vehicleMaintenanceInitialValues,
    vehicleInspectionInitialValues,
  },
  tables: {
    getAdminReservationsColumns,
    getAdminContactMessagesColumns,
    getAdminVehiclesColumns,
    dataTableStyles,
  },
  validations: {
    loginFormValidationSchema,
    registerFormValidationSchema,
    adminReservationDetailsFormValidationSchema,
    adminReservationBookingValidationSchema,
    adminUserDetailsFormValidationSchema,
    adminVehicleFormValidationSchema,
    reservationSearchValidationSchema,
    bookingFormValidationSchema,
    contactFormValidationSchema,
    reviewFormValidationSchema,
    userPasswordFormValidationSchema,
    userProfileFormValidationSchema,
    vehicleInsuranceValidationSchema,
    vehicleTaxValidationSchema,
    vehicleMaintenanceValidationSchema,
    vehicleInspectionValidationSchema,
  },
};
