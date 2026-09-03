import { deleteMessage, getMessage, getMessagesByPage, sendMessage } from "./contact/contact-service";

import { cancelReservation, confirmReservation, convertReservationToContract, createReservation, createReservationAdmin, getReservationById, getReservationByIdAdmin, getReservationsByPage, getReservationsByPageAdmin, isVehicleAvailable, updateReservationAdmin } from "./reservation/reservation-service";

import { cancelContract, createContract, createInvoice, deleteContract, downloadContractReports, extendContract, getAdminSchedule, getAvailableCars, getContractByIdAdmin, getContractsByPage, reopenContract, returnContract, updateContract } from "./contract/contract-service";

import { addContractRecord, deleteContractRecord, getContractRecords, updateContractRecord } from "./contract/contract-record-service";

import { createUserAdmin, deleteUser, downloadUserReports, getUser, getUserAdmin, getUsersByPage, login, register, updatePassword, updateUser, updateUserAdmin } from "./user/user-service";

import { addVehicle, deleteVehicle, deleteVehicleImage, downloadVehicleReports, getExpiryAlerts, getFleetStats, getVehicleById, getVehicles, getVehiclesByPage, getVehiclesByPageAdmin, updateVehicle, uploadVehicleImage } from "./vehicle/vehicle-service";

import { addVehicleRecord, deleteVehicleRecord, getVehicleRecords, updateVehicleRecord } from "./vehicle/vehicle-records-service";

import { addBranch, deleteBranch, getBranches, getPublicBranches, updateBranch } from "./branch/branch-service";

import { addCorporate, deleteCorporate, getCorporate, getCorporates, updateCorporate } from "./corporate/corporate-service";

import { addExtra, deleteExtra, getExtras, updateExtra } from "./extra/extra-service";

import { addAnnouncement, deleteAnnouncement, getActiveAnnouncements, getAnnouncements, updateAnnouncement } from "./announcement/announcement-service";

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
        createInvoice,
        getAvailableCars,
        getAdminSchedule,
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
        deleteVehicleImage,
        downloadVehicleReports,
        getFleetStats,
        getExpiryAlerts,
        getVehiclesByPageAdmin,
        updateVehicle,
        uploadVehicleImage,
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
    encryptedLocalStorage,
    authHeader
}