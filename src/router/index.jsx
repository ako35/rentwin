import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  AboutPage,
  AdminAnnouncementsPage,
  AdminComingSoonPage,
  AdminContactMessageDetailsPage,
  AdminContactMessagesPage,
  AdminDashboard,
  AdminExtrasPage,
  AdminFinancePage,
  AdminCariLedgerPage,
  AdminCariStatementPrintPage,
  AdminBranchesPage,
  AdminRentalLocationsPage,
  AdminNewCustomerPage,
  AdminNewVehiclePage,
  AdminContractDetailsPage,
  AdminContractPrintPage,
  AdminContractsPage,
  AdminReservationsPage,
  AdminReservationFormPage,
  AdminUserDetailsPage,
  AdminUsersPage,
  AdminVehicleDetailsPage,
  AdminVehiclesPage,
  ContactPage,
  ErrorPage,
  HomePage,
  LocationsPage,
  LocationDetailPage,
  LoginPage,
  PrivacyPolicyPage,
  RegisterPage,
  UserProfilePage,
  UserReservationDetailsPage,
  UserReservationsPage,
  VehicleDetailsPage,
  VehiclesPage,
} from "../pages";
import { AdminLayout, AuthLayout, CommonLayout, UserLayout } from "../layouts";

const router = createBrowserRouter([
  // COMMON ROUTES
  {
    path: "/",
    element: <CommonLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "contact",
        element: <ContactPage />,
      },
      {
        path: "lokasyonlar",
        children: [
          {
            index: true,
            element: <LocationsPage />,
          },
          {
            path: ":slug",
            element: <LocationDetailPage />,
          },
        ],
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicyPage />,
      },
      {
        path: "vehicles",
        children: [
          {
            index: true,
            element: <VehiclesPage />,
          },
          {
            path: ":vehicleId",
            element: <VehicleDetailsPage />,
          },
        ],
      },
      // USER ROUTES
      {
        path: "user",
        element: <UserLayout />,
        children: [
          {
            index: true,
            element: <UserProfilePage />,
          },
          {
            path: "reservations",
            children: [
              {
                index: true,
                element: <UserReservationsPage />,
              },
              {
                path: ":reservationId",
                element: <UserReservationDetailsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  // AUTH ROUTES
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
    ],
  },
  // ADMIN ROUTES
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "announcements",
        element: <AdminAnnouncementsPage />,
      },
      {
        path: "branches",
        element: <AdminBranchesPage />,
      },
      {
        path: "rental-locations",
        element: <AdminRentalLocationsPage />,
      },
      {
        path: "extras",
        element: <AdminExtrasPage />,
      },
      {
        path: "finans",
        children: [
          { index: true, element: <AdminFinancePage /> },
          { path: "cari/:userId", element: <AdminCariLedgerPage /> },
          { path: "cari/:userId/ekstre", element: <AdminCariStatementPrintPage /> },
        ],
      },
      {
        path: "coming-soon/:module",
        element: <AdminComingSoonPage />,
      },
      {
        path: "contact-messages",
        children: [
          {
            index: true,
            element: <AdminContactMessagesPage />,
          },
          {
            path: ":contactMessageId",
            element: <AdminContactMessageDetailsPage />,
          },
        ],
      },
      {
        path: "reservations",
        children: [
          { index: true, element: <AdminReservationsPage /> },
          { path: "new", element: <AdminReservationFormPage /> },
          { path: ":reservationId", element: <AdminReservationFormPage /> },
        ],
      },
      {
        path: "contracts",
        children: [
          {
            index: true,
            element: <AdminContractsPage />,
          },
          {
            path: "new",
            element: <AdminContractDetailsPage />,
          },
          {
            path: ":contractId",
            element: <AdminContractDetailsPage />,
          },
          {
            path: ":contractId/yazdir/:docType",
            element: <AdminContractPrintPage />,
          },
        ],
      },
      {
        path: "users",
        children: [
          {
            index: true,
            element: <AdminUsersPage />,
          },
          {
            path: "new",
            element: <AdminNewCustomerPage />,
          },
          {
            path: ":userId",
            element: <AdminUserDetailsPage />,
          },
        ],
      },
      {
        path: "vehicles",
        children: [
          {
            index: true,
            element: <AdminVehiclesPage />,
          },
          {
            path: "new",
            element: <AdminNewVehiclePage />,
          },
          {
            path: ":vehicleId",
            element: <AdminVehicleDetailsPage />,
          },
        ],
      },
    ],
  },
  // ERROR ROUTES
  {
    path: "/forbidden",
    element: <ErrorPage />,
  },
  {
    path: "*", // * ifadesi hicbir seye uymuyorsa demek 
    element: <ErrorPage />,
  },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
