import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Public pages stay eager: they are the SEO-critical, first-paint routes and
// the ones react-snap prerenders. The authenticated app (admin / auth / user)
// is code-split so an anonymous visitor or crawler never downloads it.
import CommonLayout from "../layouts/common/layout";
import AboutPage from "../pages/common/about/page";
import BlogPage from "../pages/common/blog/page";
import BlogDetailPage from "../pages/common/blog/details/page";
import CampaignsPage from "../pages/common/campaigns/page";
import ContactPage from "../pages/common/contact/page";
import FaqPage from "../pages/common/faq/page";
import LocationsPage from "../pages/common/locations/page";
import LocationDetailPage from "../pages/common/locations/details/page";
import ErrorPage from "../pages/common/error/page";
import HomePage from "../pages/common/home/page";
import LoadingPage from "../pages/common/loading/page";
import PrivacyPolicyPage from "../pages/common/privacy-policy/page";
import ReviewsPage from "../pages/common/reviews/page";
import VehiclesPage from "../pages/common/vehicles/page";
import VehicleDetailsPage from "../pages/common/vehicles/details/page";

const AdminLayout = lazy(() => import("../layouts/admin/layout"));
const AuthLayout = lazy(() => import("../layouts/auth/layout"));
const UserLayout = lazy(() => import("../layouts/user/layout"));

const LoginPage = lazy(() => import("../pages/common/login/page"));
const RegisterPage = lazy(() => import("../pages/common/register/page"));
const UserProfilePage = lazy(() => import("../pages/common/user/profile/page"));
const UserReservationsPage = lazy(() => import("../pages/common/user/reservations/page"));
const UserReservationDetailsPage = lazy(() => import("../pages/common/user/reservations/details/page"));

const AdminAnnouncementsPage = lazy(() => import("../pages/admin/announcements/page"));
const AdminBlogPage = lazy(() => import("../pages/admin/blog/page"));
const AdminCampaignsPage = lazy(() => import("../pages/admin/campaigns/page"));
const AdminComingSoonPage = lazy(() => import("../pages/admin/coming-soon/page"));
const AdminContactMessagesPage = lazy(() => import("../pages/admin/contact-messages/page"));
const AdminContactMessageDetailsPage = lazy(() => import("../pages/admin/contact-messages/details/page"));
const AdminDashboard = lazy(() => import("../pages/admin/dashboard/page"));
const AdminExtrasPage = lazy(() => import("../pages/admin/extras/page"));
const AdminSettingsPage = lazy(() => import("../pages/admin/settings/page"));
const AdminFinancePage = lazy(() => import("../pages/admin/finance/page"));
const AdminCariLedgerPage = lazy(() => import("../pages/admin/finance/cari/page"));
const AdminCariStatementPrintPage = lazy(() => import("../pages/admin/finance/cari/print"));
const AdminBranchesPage = lazy(() => import("../pages/admin/branches/page"));
const AdminRentalLocationsPage = lazy(() => import("../pages/admin/rental-locations/page"));
const AdminContractsPage = lazy(() => import("../pages/admin/contracts/page"));
const AdminContractDetailsPage = lazy(() => import("../pages/admin/contracts/details/page"));
const AdminContractPrintPage = lazy(() => import("../pages/admin/contracts/print/page"));
const AdminReservationsPage = lazy(() => import("../pages/admin/reservations/page"));
const AdminReservationFormPage = lazy(() => import("../pages/admin/reservations/form/page"));
const AdminReviewsPage = lazy(() => import("../pages/admin/reviews/page"));
const AdminUsersPage = lazy(() => import("../pages/admin/users/page"));
const AdminUserDetailsPage = lazy(() => import("../pages/admin/users/details/page"));
const AdminVehiclesPage = lazy(() => import("../pages/admin/vehicles/page"));
const AdminVehicleDetailsPage = lazy(() => import("../pages/admin/vehicles/details/page"));
const AdminNewVehiclePage = lazy(() => import("../pages/admin/vehicles/new/page"));
const AdminVehicleModelImagesPage = lazy(() => import("../pages/admin/vehicles/model-images/page"));
const AdminVehicleStatusBoardPage = lazy(() => import("../pages/admin/vehicles/status-board/page"));
const AdminNewCustomerPage = lazy(() => import("../pages/admin/users/new/page"));

const lazyRoute = (element) => <Suspense fallback={<LoadingPage />}>{element}</Suspense>;

// The public marketing pages — mounted once unprefixed (TR, the existing/
// canonical URLs) and again under "/en" (see below). Same components both
// times; CommonLayout tells them which language they're in via the URL
// (src/hooks/use-locale.js), so nothing page-specific needs to change here.
const marketingRoutes = () => [
  { index: true, element: <HomePage /> },
  { path: "about", element: <AboutPage /> },
  {
    path: "blog",
    children: [
      { index: true, element: <BlogPage /> },
      { path: ":slug", element: <BlogDetailPage /> },
    ],
  },
  { path: "kampanyalar", element: <CampaignsPage /> },
  { path: "contact", element: <ContactPage /> },
  { path: "sss", element: <FaqPage /> },
  {
    path: "lokasyonlar",
    children: [
      { index: true, element: <LocationsPage /> },
      { path: ":slug", element: <LocationDetailPage /> },
    ],
  },
  { path: "privacy-policy", element: <PrivacyPolicyPage /> },
  { path: "yorumlar", element: <ReviewsPage /> },
  {
    path: "vehicles",
    children: [
      { index: true, element: <VehiclesPage /> },
      { path: ":vehicleId", element: <VehicleDetailsPage /> },
    ],
  },
];

const router = createBrowserRouter([
  // COMMON ROUTES
  {
    path: "/",
    element: <CommonLayout />,
    children: [
      ...marketingRoutes(),
      // USER ROUTES
      {
        path: "user",
        element: lazyRoute(<UserLayout />),
        children: [
          { index: true, element: lazyRoute(<UserProfilePage />) },
          {
            path: "reservations",
            children: [
              { index: true, element: lazyRoute(<UserReservationsPage />) },
              { path: ":reservationId", element: lazyRoute(<UserReservationDetailsPage />) },
            ],
          },
        ],
      },
    ],
  },
  // ENGLISH MARKETING ROUTES — same pages, "/en" prefix. Not react-snap'd,
  // not (yet) FCP-optimized on the homepage; see [[rentwin-seo]] for the
  // scope note. Kept as its own top-level root (not nested under "/") so its
  // pages match on an exact "/en/..." pathname instead of react-router
  // treating "en" as a dynamic segment of "/".
  {
    path: "/en",
    element: <CommonLayout />,
    children: marketingRoutes(),
  },
  // AUTH ROUTES
  {
    path: "/auth",
    element: lazyRoute(<AuthLayout />),
    children: [
      { path: "login", element: lazyRoute(<LoginPage />) },
      { path: "register", element: lazyRoute(<RegisterPage />) },
    ],
  },
  // ADMIN ROUTES
  {
    path: "/admin",
    element: lazyRoute(<AdminLayout />),
    children: [
      { index: true, element: lazyRoute(<AdminDashboard />) },
      { path: "announcements", element: lazyRoute(<AdminAnnouncementsPage />) },
      { path: "campaigns", element: lazyRoute(<AdminCampaignsPage />) },
      { path: "blog", element: lazyRoute(<AdminBlogPage />) },
      { path: "reviews", element: lazyRoute(<AdminReviewsPage />) },
      { path: "branches", element: lazyRoute(<AdminBranchesPage />) },
      { path: "rental-locations", element: lazyRoute(<AdminRentalLocationsPage />) },
      { path: "extras", element: lazyRoute(<AdminExtrasPage />) },
      { path: "settings", element: lazyRoute(<AdminSettingsPage />) },
      {
        path: "finans",
        children: [
          { index: true, element: lazyRoute(<AdminFinancePage />) },
          { path: "cari/:userId", element: lazyRoute(<AdminCariLedgerPage />) },
          { path: "cari/:userId/ekstre", element: lazyRoute(<AdminCariStatementPrintPage />) },
        ],
      },
      { path: "coming-soon/:module", element: lazyRoute(<AdminComingSoonPage />) },
      {
        path: "contact-messages",
        children: [
          { index: true, element: lazyRoute(<AdminContactMessagesPage />) },
          { path: ":contactMessageId", element: lazyRoute(<AdminContactMessageDetailsPage />) },
        ],
      },
      {
        path: "reservations",
        children: [
          { index: true, element: lazyRoute(<AdminReservationsPage />) },
          { path: "new", element: lazyRoute(<AdminReservationFormPage />) },
          { path: ":reservationId", element: lazyRoute(<AdminReservationFormPage />) },
        ],
      },
      {
        path: "contracts",
        children: [
          { index: true, element: lazyRoute(<AdminContractsPage />) },
          { path: "new", element: lazyRoute(<AdminContractDetailsPage />) },
          { path: ":contractId", element: lazyRoute(<AdminContractDetailsPage />) },
          { path: ":contractId/yazdir/:docType", element: lazyRoute(<AdminContractPrintPage />) },
        ],
      },
      {
        path: "users",
        children: [
          { index: true, element: lazyRoute(<AdminUsersPage />) },
          { path: "new", element: lazyRoute(<AdminNewCustomerPage />) },
          { path: ":userId", element: lazyRoute(<AdminUserDetailsPage />) },
        ],
      },
      {
        path: "vehicles",
        children: [
          { index: true, element: lazyRoute(<AdminVehiclesPage />) },
          { path: "new", element: lazyRoute(<AdminNewVehiclePage />) },
          { path: "model-images", element: lazyRoute(<AdminVehicleModelImagesPage />) },
          { path: "status", element: lazyRoute(<AdminVehicleStatusBoardPage />) },
          { path: ":vehicleId", element: lazyRoute(<AdminVehicleDetailsPage />) },
        ],
      },
    ],
  },
  // ERROR ROUTES
  { path: "/forbidden", element: <ErrorPage /> },
  { path: "*", element: <ErrorPage /> },
]);

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
