import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { loadAdminTranslations } from "../i18n";

// Only the layout, the homepage and the error/loading screens are in the
// entry bundle. Every other public page is its own chunk: crawlers get each
// page's content from the backend prerender (backend/src/lib/seo-ld.js), so
// the browser no longer has to download all of them before the first paint
// (mobile Lighthouse 2026-11-09: a 1.09 MB entry chunk, ~1.6 s TBT). The
// authenticated app (admin / auth / user) is split the same way.
import CommonLayout from "../layouts/common/layout";
import ErrorPage from "../pages/common/error/page";
import HomePage from "../pages/common/home/page";
import LoadingPage from "../pages/common/loading/page";

const AboutPage = lazy(() => import("../pages/common/about/page"));
const BlogPage = lazy(() => import("../pages/common/blog/page"));
const BlogDetailPage = lazy(() => import("../pages/common/blog/details/page"));
const CampaignsPage = lazy(() => import("../pages/common/campaigns/page"));
const ContactPage = lazy(() => import("../pages/common/contact/page"));
const FaqPage = lazy(() => import("../pages/common/faq/page"));
const LandingPage = lazy(() => import("../pages/common/landing/page"));
const LocationsPage = lazy(() => import("../pages/common/locations/page"));
const LocationDetailPage = lazy(() => import("../pages/common/locations/details/page"));
const PrivacyPolicyPage = lazy(() => import("../pages/common/privacy-policy/page"));
const ReviewsPage = lazy(() => import("../pages/common/reviews/page"));
const VehiclesPage = lazy(() => import("../pages/common/vehicles/page"));
const VehicleDetailsPage = lazy(() => import("../pages/common/vehicles/details/page"));

// The admin translations are fetched alongside the layout chunk, so every
// admin page (all rendered inside AdminLayout) finds its namespace ready.
const AdminLayout = lazy(() =>
  Promise.all([import("../layouts/admin/layout"), loadAdminTranslations()]).then(([layout]) => layout)
);
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
const AdminPriceListPage = lazy(() => import("../pages/admin/price-list/page"));
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
  { path: "about", element: lazyRoute(<AboutPage />) },
  {
    path: "blog",
    children: [
      { index: true, element: lazyRoute(<BlogPage />) },
      { path: ":slug", element: lazyRoute(<BlogDetailPage />) },
    ],
  },
  { path: "kampanyalar", element: lazyRoute(<CampaignsPage />) },
  { path: "contact", element: lazyRoute(<ContactPage />) },
  { path: "sss", element: lazyRoute(<FaqPage />) },
  { path: "ticari-arac-kiralama", element: lazyRoute(<LandingPage variant="commercial" />) },
  { path: "uzun-donem-arac-kiralama", element: lazyRoute(<LandingPage variant="longTerm" />) },
  {
    path: "lokasyonlar",
    children: [
      { index: true, element: lazyRoute(<LocationsPage />) },
      { path: ":slug", element: lazyRoute(<LocationDetailPage />) },
    ],
  },
  { path: "privacy-policy", element: lazyRoute(<PrivacyPolicyPage />) },
  { path: "yorumlar", element: lazyRoute(<ReviewsPage />) },
  {
    path: "vehicles",
    children: [
      { index: true, element: lazyRoute(<VehiclesPage />) },
      { path: ":vehicleId", element: lazyRoute(<VehicleDetailsPage />) },
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
      { path: "price-list", element: lazyRoute(<AdminPriceListPage />) },
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

// GA4's own automatic page_view only fires once, for the initial document
// load (index.html sets send_page_view: false) — a client-side route change
// here is invisible to it otherwise. Reporting it centrally via the router's
// subscribe() means every route is covered without touching each page.
let lastGaPath = null;
const reportPageView = (location) => {
  const path = location.pathname + location.search;
  if (path === lastGaPath) return;
  lastGaPath = path;
  if (typeof window.gtag !== "function") return;
  // Deferred a tick so the new route's usePageMeta effect has already set
  // document.title by the time we read it.
  setTimeout(() => {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, 0);
};
reportPageView(router.state.location);
router.subscribe((state) => reportPageView(state.location));

const AppRouter = () => <RouterProvider router={router} />;

export default AppRouter;
