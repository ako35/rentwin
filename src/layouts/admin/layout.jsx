import { useLayoutEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { constants } from "../../constants";
import { AdminFilterBar, AdminFooter, AdminTopNav } from "../../components";
import { usePageMeta } from "../../hooks/use-page-meta";
import { activateAdminTheme, deactivateAdminTheme } from "../../hooks/use-admin-theme";
import './style.scss'

const { routes } = constants;

const AdminLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const [branchId, setBranchId] = useState("");
  usePageMeta({ title: "Rentwin", noindex: true });

  // The dark theme lives only inside the admin panel — set the document
  // attributes on mount and strip them again when we leave for the public site.
  useLayoutEffect(() => {
    activateAdminTheme();
    return deactivateAdminTheme;
  }, []);

  if(!user || !user?.roles?.includes('Administrator')) return <Navigate to={`${routes.forbidden}`} />
  return (
    <div className="admin-layout">
      <AdminTopNav />
      <AdminFilterBar branchId={branchId} onBranchChange={setBranchId} />
      <div className="admin-layout__content">
        <Outlet context={{ branchId }} />
      </div>
      <AdminFooter />
    </div>
  )
}

export default AdminLayout
