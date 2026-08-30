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

const ownershipTypes = [
  { id: 1, name: "Owned", value: "Owned" },
  { id: 2, name: "Rented", value: "Rented" },
  { id: 3, name: "OperationalLease", value: "OperationalLease" },
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

const reservationStatus = [
  {
    id: 1,
    name: "CREATED",
    value: "CREATED",
  },
  {
    id: 2,
    name: "CANCELLED",
    value: "CANCELLED",
  },
  {
    id: 3,
    name: "DONE",
    value: "DONE",
  },
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
  adminLocations: "/admin/locations",
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

const website = {
  name: "Rentwin",
  address:
    "Rentwin Headquarters, 150 Main Street, San Francisco, CA 94105, United States",
  phone: "0507 350 31 35",
  mapUrl: "https://goo.gl/maps/qTTsxo39YWMdGXd88",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3152.9631309952415!2d-122.3940873!3d37.790903799999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80858064f28f34d9%3A0xd368cc2220a9c46e!2s150%20Main%20St%2C%20San%20Francisco%2C%20CA%2094105%2C%20USA!5e0!3m2!1sen!2str!4v1687887041591!5m2!1sen!2str",
  email: "info@rentwin.com",
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
  ownershipTypes,
  reservationStatus,
  roles,
  routes,
  taxInstallments,
  transmissionTypes,
  website,
};
