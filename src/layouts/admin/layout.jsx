import { useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { constants } from "../../constants";
import { AdminFilterBar, AdminFooter, AdminTopNav } from "../../components";
import './style.scss'

const { routes } = constants;

const AdminLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const [branchId, setBranchId] = useState("");

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
