import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";
import { utils } from "../../../../../utils";

// Bottom action bar — differs between create ("Vazgeç" / "Oluştur ve Aç") and
// edit ("Araç Teslim Al" / "Kontratı İptal Et" / "Yazdır" / "Kaydet").
const ContractActions = ({ isCreate, updating, deleting, canSave, onDiscard, onDelete }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) {
    return (
      <div className="contract-page__actions">
        <Button variant="outline-secondary" type="button" disabled={updating} onClick={onDiscard}>
          {c("discard")}
        </Button>
        <span className="contract-page__actions-spacer" />
        <Button type="submit" disabled={!canSave || updating}>
          {updating && <Spinner animation="border" size="sm" />} {c("createSave")}
        </Button>
      </div>
    );
  }

  return (
    <div className="contract-page__actions">
      <Button
        variant="info" type="button"
        onClick={() => utils.functions.swalToast(t("alertBar.comingSoonToast"), "info")}
      >
        {c("vehicleReturn")}
      </Button>
      <span className="contract-page__actions-spacer" />
      <Button variant="outline-danger" type="button" disabled={deleting || updating} onClick={onDelete}>
        {deleting && <Spinner animation="border" size="sm" />} {c("cancelContract")}
      </Button>
      <Button variant="warning" type="button" onClick={() => window.print()}>{c("print")}</Button>
      <Button type="submit" disabled={!canSave || updating}>
        {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
      </Button>
    </div>
  );
};

export default ContractActions;
