import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";

// Sticky bottom action bar. Dangerous / secondary actions sit on the left,
// primary flow actions on the right.
// Create: "Vazgeç" | "Oluştur ve Aç".
// Edit (open): "Kontratı İptal Et", "Sil" | "Yazdır", "Araç Teslim Al", "Kaydet".
// Edit (closed DONE/CANCELLED): the form is read-only, so only "Geri Aç" shows.
const ContractActions = ({
  isCreate, updating, deleting, canSave, status,
  onDiscard, onDelete, onVehicleReturn, onCancelContract, onReopen,
}) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  if (isCreate) {
    return (
      <div className="contract-page__actionbar">
        <div className="contract-page__actionbar-left">
          <Button variant="outline-secondary" type="button" disabled={updating} onClick={onDiscard}>
            {c("discard")}
          </Button>
        </div>
        <div className="contract-page__actionbar-right">
          <Button type="submit" disabled={!canSave || updating}>
            {updating && <Spinner animation="border" size="sm" />} {c("createSave")}
          </Button>
        </div>
      </div>
    );
  }

  const closed = status === "DONE" || status === "CANCELLED";

  return (
    <div className="contract-page__actionbar">
      <div className="contract-page__actionbar-left">
        {!closed && (
          <>
            <Button variant="outline-danger" type="button" disabled={updating} onClick={onCancelContract}>
              {c("cancelContract")}
            </Button>
            <Button
              variant="link"
              className="contract-page__delete-link"
              type="button"
              disabled={deleting || updating}
              onClick={onDelete}
            >
              {deleting && <Spinner animation="border" size="sm" />} {c("deleteContract")}
            </Button>
          </>
        )}
      </div>
      <div className="contract-page__actionbar-right">
        <Button variant="outline-secondary" type="button" onClick={() => window.print()}>
          {c("print")}
        </Button>
        {closed ? (
          <Button variant="outline-secondary" type="button" disabled={updating} onClick={onReopen}>
            {updating && <Spinner animation="border" size="sm" />} {c("reopenContract")}
          </Button>
        ) : (
          <>
            <Button variant="info" type="button" disabled={updating} onClick={onVehicleReturn}>
              {c("vehicleReturn")}
            </Button>
            <Button type="submit" disabled={!canSave || updating}>
              {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ContractActions;
