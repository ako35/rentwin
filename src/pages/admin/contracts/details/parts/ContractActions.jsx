import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";

// Bottom action bar. Create: "Vazgeç" / "Oluştur ve Aç". Edit: lifecycle actions
// ("Araç Teslim Al" -> DONE, "Kontratı İptal Et" -> CANCELLED, "Geri Aç" ->
// CREATED) plus "Sil" (hard delete), "Yazdır" and "Kaydet". Once a contract is
// closed (DONE/CANCELLED) the form is read-only, so Kaydet is hidden.
const ContractActions = ({
  isCreate, updating, deleting, canSave, status,
  onDiscard, onDelete, onVehicleReturn, onCancelContract, onReopen,
}) => {
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

  const closed = status === "DONE" || status === "CANCELLED";

  return (
    <div className="contract-page__actions">
      {closed ? (
        <Button variant="outline-secondary" type="button" disabled={updating} onClick={onReopen}>
          {updating && <Spinner animation="border" size="sm" />} {c("reopenContract")}
        </Button>
      ) : (
        <>
          <Button variant="info" type="button" disabled={updating} onClick={onVehicleReturn}>
            {c("vehicleReturn")}
          </Button>
          <Button variant="outline-danger" type="button" disabled={updating} onClick={onCancelContract}>
            {c("cancelContract")}
          </Button>
        </>
      )}
      <span className="contract-page__actions-spacer" />
      <Button
        variant="link"
        className="contract-page__delete-link"
        type="button"
        disabled={deleting || updating}
        onClick={onDelete}
      >
        {deleting && <Spinner animation="border" size="sm" />} {c("deleteContract")}
      </Button>
      <Button variant="warning" type="button" onClick={() => window.print()}>{c("print")}</Button>
      {!closed && (
        <Button type="submit" disabled={!canSave || updating}>
          {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
        </Button>
      )}
    </div>
  );
};

export default ContractActions;
