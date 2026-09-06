import { Alert } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import InitialsAvatar from "../../initials-avatar/initials-avatar";
import "./avatar.scss";

const UserAvatar = () => {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation("user");
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    <div className="user-avatar">
      <InitialsAvatar name={fullName} size={104} className="user-avatar__badge" />
      <h4>{fullName}</h4>
      <p>
        <em>{user?.email}</em>
      </p>
      {user?.builtIn && (
        <Alert variant="warning" className="mt-4">
          {t("profile.builtInWarning")}
        </Alert>
      )}
    </div>
  );
};

export default UserAvatar;
