const errors = {
  notFound: {
    code: 404,
    title: "Oops! Page Not Found",
    desc: "The page you are looking for might have been removed had its name changed or is temporarily unavailable. Please try again later.",
  },
  forbidden: {
    code: 403,
    title: "Oops! Forbidden Access!",
    desc: "You don't have permission to access this page. If you think otherwise, please contact the administrator.",
  },
};

const fuelTypes = [
  {
    id: 1,
    name: "Diesel",
    value: "Diesel",
  },
  {
    id: 2,
    name: "Gasoline",
    value: "Gasoline",
  },
  {
    id: 3,
    name: "Hybrid",
    value: "Hybrid",
  },
  {
    id: 4,
    name: "Electricity",
    value: "Electricity",
  },
  {
    id: 5,
    name: "LPG",
    value: "LPG",
  },
  {
    id: 6,
    name: "CNG",
    value: "CNG",
  },
  {
    id: 7,
    name: "Hydrogen",
    value: "Hydrogen",
  },
];


const insuranceTypes = [
  { id: 1, name: "Traffic", value: "Traffic" },
  { id: 2, name: "Kasko", value: "Kasko" },
];

const maintenanceTypes = [
  { id: 1, name: "Periodic", value: "Periodic" },
  { id: 2, name: "Repair", value: "Repair" },
  { id: 3, name: "Tire", value: "Tire" },
  { id: 4, name: "Other", value: "Other" },
];

const inspectionTypes = [
  { id: 1, name: "Periodic", value: "Periodic" },
  { id: 2, name: "Emission", value: "Emission" },
];

const inspectionResults = [
  { id: 1, name: "Pass", value: "Pass" },
  { id: 2, name: "Fail", value: "Fail" },
  { id: 3, name: "Defective", value: "Defective" },
];

const taxInstallments = [
  { id: 1, name: "1", value: 1 },
  { id: 2, name: "2", value: 2 },
];

const contractStatus = [
  { id: 1, name: "CREATED", value: "CREATED" },
  { id: 2, name: "CANCELLED", value: "CANCELLED" },
  { id: 3, name: "DONE", value: "DONE" },
];

const reservationStatus = [
  { id: 1, name: "PENDING", value: "PENDING" },
  { id: 2, name: "CONFIRMED", value: "CONFIRMED" },
  { id: 3, name: "CANCELLED", value: "CANCELLED" },
  { id: 4, name: "CONVERTED", value: "CONVERTED" },
];

const roles = [
  {
    id: 1,
    name: "Customer",
    value: "Customer",
  },
  {
    id: 2,
    name: "Administrator",
    value: "Administrator",
  },
];

const routes = {
  // ADMIN ROUTES
  adminAnnouncements: "/admin/announcements",
  adminComingSoon: "/admin/coming-soon",
  adminContactMessages: "/admin/contact-messages",
  adminDashboard: "/admin",
  adminExtras: "/admin/extras",
  adminBranches: "/admin/branches",
  adminRentalLocations: "/admin/rental-locations",
  adminContracts: "/admin/contracts",
  adminReservations: "/admin/reservations",
  adminUsers: "/admin/users",
  adminVehicles: "/admin/vehicles",

  // COMMON ROUTES
  about: "/about",
  contact: "/contact",
  forbidden: "/forbidden",
  home: "/",
  login: "/auth/login",
  privacyPolicy: "/privacy-policy",
  register: "/auth/register",
  userProfile: "/user",
  userReservations: "/user/reservations",
  vehicles: "/vehicles",
};

const rentwinAddress = "KÜLTÜR MAH. 260 SK. NO: 3 E ALİAĞA / İZMİR";

const website = {
  name: "Rentwin",
  address: rentwinAddress,
  phone: "0507 350 31 35",
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rentwinAddress)}`,
  mapEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(rentwinAddress)}&output=embed`,
  email: "info@rentwin.com.tr",
  instagram: "https://www.instagram.com/rentwin/",
  facebook: "https://www.facebook.com/rentwin/",
  twitter: "https://twitter.com/rentwin/",
  linkedin: "https://www.linkedin.com/company/rentwin/",
  youtube: "https://www.youtube.com/channel/rentwin/",
};

const transmissionTypes = [
  {
    id: 1,
    name: "Manual",
    value: "Manual",
  },
  {
    id: 2,
    name: "SemiAutomatic",
    value: "SemiAutomatic",
  },
  {
    id: 3,
    name: "Automatic",
    value: "Automatic",
  },
];

export const constants = {
  fuelTypes,
  errors,
  inspectionResults,
  inspectionTypes,
  insuranceTypes,
  maintenanceTypes,
  contractStatus,
  reservationStatus,
  roles,
  routes,
  taxInstallments,
  transmissionTypes,
  website,
};
