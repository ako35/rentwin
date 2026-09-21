import { useLayoutEffect, useRef, useState } from "react";
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
  const headerRef = useRef(null);
  const isAdmin = !!user?.roles?.includes('Administrator');
  usePageMeta({ title: "Rentwin", noindex: true });

  // The dark theme lives only inside the admin panel — set the document
  // attributes on mount and strip them again when we leave for the public site.
  useLayoutEffect(() => {
    activateAdminTheme();
    return deactivateAdminTheme;
  }, []);

  // The header is sticky, so anything else that pins itself to the top of the
  // viewport (settings sidebar) or scrolls a focused field into view has to
  // clear it — and its height isn't fixed (the menu wraps to a second row at
  // some widths), so publish the live value instead of hardcoding one.
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    const root = document.documentElement;
    const sync = () => {
      const h = header.offsetHeight;
      root.style.setProperty("--admin-header-h", `${h}px`);
      root.style.scrollPaddingTop = `${h + 8}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--admin-header-h");
      root.style.scrollPaddingTop = "";
    };
  }, [isAdmin]);

  if(!user || !isAdmin) return <Navigate to={`${routes.forbidden}`} />
  return (
    <div className="admin-layout">
      <header className="admin-layout__header" ref={headerRef}>
        <AdminTopNav />
        <AdminFilterBar branchId={branchId} onBranchChange={setBranchId} />
      </header>
      <div className="admin-layout__content">
        <Outlet context={{ branchId }} />
      </div>
      <AdminFooter />
    </div>
  )
}

export default AdminLayout
