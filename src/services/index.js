import { deleteMessage, getMessage, getMessagesByPage, sendMessage } from "./contact/contact-service";

import { createReservation, deleteReservation, downloadReservationReports, getAdminSchedule, getReservationById, getReservationByIdAdmin, getReservationsByPage, getReservationsByPageAdmin, isVehicleAvailable, updateReservation } from "./reservation/reservation-service";

import { deleteUser, downloadUserReports, getUser, getUserAdmin, getUsersByPage, login, register, updatePassword, updateUser, updateUserAdmin } from "./user/user-service";

import { addVehicle, deleteVehicle, deleteVehicleImage, downloadVehicleReports, getFleetStats, getVehicleById, getVehicles, getVehiclesByPage, getVehiclesByPageAdmin, updateVehicle, uploadVehicleImage } from "./vehicle/vehicle-service";

import { addVehicleRecord, deleteVehicleRecord, getVehicleRecords, updateVehicleRecord } from "./vehicle/vehicle-records-service";

import { addVehicleClass, deleteVehicleClass, getVehicleClasses, updateVehicleClass } from "./vehicle/vehicle-class-service";

import { addBranch, deleteBranch, getBranches, getPublicBranches, updateBranch } from "./branch/branch-service";

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
        // COMMON ENDPOINTS
        createReservation,
        getReservationById,
        getReservationsByPage,
        isVehicleAvailable,
        // ADMIN ENDPOINTS
        deleteReservation,
        downloadReservationReports,
        getAdminSchedule,
        getReservationByIdAdmin,
        getReservationsByPageAdmin,
        updateReservation,
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
    vehicleClass: {
        getVehicleClasses,
        addVehicleClass,
        updateVehicleClass,
        deleteVehicleClass,
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