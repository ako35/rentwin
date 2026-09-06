import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { usePageMeta } from "../../hooks/use-page-meta";

const UserLayout = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);
  usePageMeta({ title: "Rentwin", noindex: true });

  if (!isLoggedIn) return <Navigate to={"/login"} />;

  return (
    <>
      <Outlet />
    </>
  );
};

export default UserLayout;
