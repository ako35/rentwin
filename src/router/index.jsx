import { createBrowserRouter, RouterProvider } from "react-router-dom";
import {
  AboutPage,
  AdminAnnouncementsPage,
  AdminComingSoonPage,
  AdminContactMessageDetailsPage,
  AdminContactMessagesPage,
  AdminDashboard,
  AdminExtrasPage,
  AdminLocationsPage,
  AdminNewCustomerPage,
  AdminNewVehiclePage,
  AdminReservationDetailsPage,
  AdminReservationsPage,
  AdminUserDetailsPage,
  AdminUsersPage,
  AdminVehicleDetailsPage,
  AdminVehiclesPage,
  ContactPage,
  ErrorPage,
  HomePage,
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
        path: "locations",
        element: <AdminLocationsPage />,
      },
      {
        path: "extras",
        element: <AdminExtrasPage />,
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
          {
            index: true,
            element: <AdminReservationsPage />,
          },
          {
            path: ":reservationId",
            element: <AdminReservationDetailsPage />,
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
