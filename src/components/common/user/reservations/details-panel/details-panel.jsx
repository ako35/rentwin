import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = import.meta.env.VITE_APP_API_URL;

const UserReservationDetailsPanel = (props) => {
  const navigate = useNavigate();
  const { t } = useTranslation("user");

  return (
    <>
      <h2>{props.car?.model}</h2>
      <img
        src={`${API_URL}/files/display${props.car?.image}`}
        alt={props.car?.model}
        title={props.car?.model}
        className="img-fluid"
      />
      <Button onClick={() => navigate(-1)}>
        {t("reservations.details.backButton")}
      </Button>
    </>
  );
};

export default UserReservationDetailsPanel;
