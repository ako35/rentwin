import { Alert } from "react-bootstrap";
import { RiAdminLine, RiUserFill } from "react-icons/ri";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

const UserAvatar = () => {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation("user");

  const iconStyle = {
    width: "120px",
    height: "120px",
  };
  return (
    <div className="user-avatar">
      {user?.roles?.includes("Administrator") ? (
        <RiAdminLine title={`${user?.firstName} ${user?.lastName}`} style={iconStyle} />
      ) : (
        <RiUserFill title={`${user?.firstName} ${user?.lastName}`} style={iconStyle} />
      )}
      <h4>
        {user?.firstName} {user?.lastName}
      </h4>
      <p style={{ overflowWrap: "break-word"}}><em>{user?.email}</em></p>
      {
        user?.builtIn && (
          <Alert variant="warning mt-5">
            {t("profile.builtInWarning")}
          </Alert>
        )
      }
    </div>
  );
};

export default UserAvatar;
