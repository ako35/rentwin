import { deleteMessage, getMessage, getMessagesByPage, sendMessage } from "./contact/contact-service";

import { cancelReservation, confirmReservation, convertReservationToContract, createReservation, createReservationAdmin, getReservationById, getReservationByIdAdmin, getReservationSchedule, getReservationsByPage, getReservationsByPageAdmin, isVehicleAvailable, updateReservationAdmin } from "./reservation/reservation-service";

import { cancelContract, changeVehicle, createContract, createInvoice, deleteContract, deleteExtension, deleteInvoice, downloadContractReports, extendContract, getAdminSchedule, getAvailableCars, getContractByIdAdmin, getContractsByPage, getHgsPendingContracts, getInvoices, reopenContract, returnContract, updateContract, updateInvoice } from "./contract/contract-service";

import { addContractRecord, deleteContractRecord, getContractRecords, updateContractRecord } from "./contract/contract-record-service";

import { createUserAdmin, deleteUser, downloadUserReports, getUser, getUserAdmin, getUsersByPage, login, register, updatePassword, updateUser, updateUserAdmin } from "./user/user-service";

import { addVehicle, deleteVehicle, downloadVehicleReports, extractRegistration, getExpiryAlerts, getFleetStats, getVehicleById, getVehicles, getVehiclesByPage, getVehiclesByPageAdmin, updateVehicle } from "./vehicle/vehicle-service";

import { addVehicleRecord, deleteVehicleRecord, getVehicleRecords, updateVehicleRecord } from "./vehicle/vehicle-records-service";
import { deleteModelImage, generateModelImage, listModelImages, uploadModelImage } from "./vehicle/vehicle-model-image-service";

import { addBranch, deleteBranch, getBranches, getPublicBranches, updateBranch } from "./branch/branch-service";
import { addLocation, deleteLocation, getLocations, updateLocation, uploadLocationImage } from "./location/location-service";

import { addCorporate, deleteCorporate, getCorporate, getCorporates, updateCorporate } from "./corporate/corporate-service";

import { addExtra, deleteExtra, getExtras, updateExtra } from "./extra/extra-service";

import { addAnnouncement, deleteAnnouncement, getActiveAnnouncements, getAnnouncements, updateAnnouncement } from "./announcement/announcement-service";
import { getSettings, updateSettings } from "./settings/settings-service";

import { addLedgerEntry, deleteLedgerEntry, getUserLedger, updateLedgerEntry } from "./ledger/ledger-service";

import { encryptedLocalStorage } from "./encrypt-storage/encrypt-storage";
import { authHeader } from "./auth-header/auth-header";

export const services = {
    contact: {
        // COMMON ENDPOINTS
        sendMessage,
        // ADMIN ENDPOINTS
        deleteMessage,
        getMessage,
        getMessagesByPage,
    },
    reservation: {
        // CUSTOMER BOOKING
        createReservation,
        getReservationById,
        getReservationsByPage,
        isVehicleAvailable,
        // ADMIN BOOKING
        getReservationsByPageAdmin,
        getReservationByIdAdmin,
        createReservationAdmin,
        updateReservationAdmin,
        confirmReservation,
        cancelReservation,
        convertReservationToContract,
        getReservationSchedule,
    },
    contract: {
        getContractsByPage,
        getContractByIdAdmin,
        createContract,
        updateContract,
        deleteContract,
        returnContract,
        cancelContract,
        reopenContract,
        extendContract,
        deleteExtension,
        changeVehicle,
        getInvoices,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        getAvailableCars,
        getAdminSchedule,
        getHgsPendingContracts,
        downloadContractReports,
        getRecords: getContractRecords,
        addRecord: addContractRecord,
        updateRecord: updateContractRecord,
        deleteRecord: deleteContractRecord,
    },
    user: {
        // COMMON ENDPOINTS
        login,
        register,
        // USER ENDPOINTS
        getUser,
        updateUser,
        updatePassword,
        // ADMIN ENDPOINTS
        createUserAdmin,
        deleteUser,
        downloadUserReports,
        getUserAdmin,
        getUsersByPage,
        updateUserAdmin,
    },
    vehicle: {
        // COMMON ENDPOINTS
        getVehicleById,
        getVehicles,
        getVehiclesByPage,
        // ADMIN ENDPOINTS
        addVehicle,
        deleteVehicle,
        downloadVehicleReports,
        getFleetStats,
        getExpiryAlerts,
        getVehiclesByPageAdmin,
        updateVehicle,
        extractRegistration,
        // MODEL IMAGE LIBRARY (marka+model başına tek görsel)
        listModelImages,
        uploadModelImage,
        generateModelImage,
        deleteModelImage,
        // VEHICLE SUB-RECORDS (insurance / tax / maintenance / inspection)
        getVehicleRecords,
        addVehicleRecord,
        updateVehicleRecord,
        deleteVehicleRecord,
    },
    branch: {
        getBranches,
        getPublicBranches,
        addBranch,
        updateBranch,
        deleteBranch,
    },
    location: {
        getLocations,
        addLocation,
        updateLocation,
        deleteLocation,
        uploadLocationImage,
    },
    corporate: {
        getCorporates,
        getCorporate,
        addCorporate,
        updateCorporate,
        deleteCorporate,
    },
    extra: {
        getExtras,
        addExtra,
        updateExtra,
        deleteExtra,
    },
    announcement: {
        getActiveAnnouncements,
        getAnnouncements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
    },
    ledger: {
        getUserLedger,
        addLedgerEntry,
        updateLedgerEntry,
        deleteLedgerEntry,
    },
    settings: {
        getSettings,
        updateSettings,
    },
    encryptedLocalStorage,
    authHeader
}