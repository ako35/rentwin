import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { BsRobot } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const formatTRY = (value) => (value == null ? "—" : `${Math.round(Number(value)).toLocaleString("tr-TR")} TL`);

const toDraft = (vehicle) => ({
  dailyPrice: vehicle.dailyPrice == null ? "" : String(vehicle.dailyPrice),
  monthlyPrice: vehicle.monthlyPrice == null ? "" : String(vehicle.monthlyPrice),
});

const AdminPriceListPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [researchingId, setResearchingId] = useState(null);
  const [research, setResearch] = useState(null); // { vehicleId, data }

  const loadData = async () => {
    try {
      const data = await services.vehicle.getPriceList();
      setVehicles(data);
      setDrafts(Object.fromEntries(data.map((vehicle) => [vehicle.id, toDraft(vehicle)])));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setDraftField = (id, field, value) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const handleSave = async (vehicle) => {
    const draft = drafts[vehicle.id];
    setSavingId(vehicle.id);
    try {
      const updated = await services.vehicle.updateVehicle(vehicle.id, {
        dailyPrice: draft.dailyPrice === "" ? null : Number(draft.dailyPrice),
        monthlyPrice: draft.monthlyPrice === "" ? null : Number(draft.monthlyPrice),
      });
      setVehicles((prev) =>
        prev.map((item) =>
          item.id === vehicle.id
            ? { ...item, dailyPrice: updated.dailyPrice, monthlyPrice: updated.monthlyPrice }
            : item
        )
      );
      setDrafts((prev) => ({ ...prev, [vehicle.id]: toDraft(updated) }));
      utils.functions.swalToast(t("priceList.toasts.saveSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(t("priceList.toasts.saveError"), "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleResearch = async (vehicle) => {
    setResearchingId(vehicle.id);
    try {
      const data = await services.vehicle.researchVehiclePrice(vehicle.id);
      setResearch({ vehicleId: vehicle.id, vehicleLabel: `${vehicle.brand} ${vehicle.model}`.trim(), data });
    } catch (error) {
      utils.functions.swalToast(t("priceList.research.toasts.error"), "error");
    } finally {
      setResearchingId(null);
    }
  };

  const applyResearch = () => {
    if (!research) return;
    const { vehicleId, data } = research;
    setDrafts((prev) => ({
      ...prev,
      [vehicleId]: {
        dailyPrice: data.dailyPriceTRY != null ? String(Math.round(data.dailyPriceTRY)) : prev[vehicleId]?.dailyPrice ?? "",
        monthlyPrice: data.monthlyPriceTRY != null ? String(Math.round(data.monthlyPriceTRY)) : prev[vehicleId]?.monthlyPrice ?? "",
      },
    }));
    setResearch(null);
  };

  return (
    <div className="admin-price-list-page">
      <div className="admin-price-list-page__toolbar">
        <h2>{t("priceList.pageTitle")}</h2>
      </div>
      <p className="admin-price-list-page__intro">{t("priceList.intro")}</p>
      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("priceList.vehicle")}</th>
              <th>{t("priceList.plate")}</th>
              <th>{t("priceList.dailyPrice")}</th>
              <th>{t("priceList.monthlyPrice")}</th>
              <th>{t("priceList.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">{t("priceList.empty")}</td>
              </tr>
            )}
            {vehicles.map((vehicle) => {
              const draft = drafts[vehicle.id] || toDraft(vehicle);
              const original = toDraft(vehicle);
              const dirty = draft.dailyPrice !== original.dailyPrice || draft.monthlyPrice !== original.monthlyPrice;
              return (
                <tr key={vehicle.id}>
                  <td>
                    {`${vehicle.brand} ${vehicle.model}`.trim()}
                    {vehicle.modelYear ? ` (${vehicle.modelYear})` : ""}
                  </td>
                  <td>{vehicle.licensePlate}</td>
                  <td>
                    <Form.Control
                      type="number"
                      size="sm"
                      min="0"
                      value={draft.dailyPrice}
                      onChange={(e) => setDraftField(vehicle.id, "dailyPrice", e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      size="sm"
                      min="0"
                      value={draft.monthlyPrice}
                      onChange={(e) => setDraftField(vehicle.id, "monthlyPrice", e.target.value)}
                    />
                  </td>
                  <td className="admin-price-list-page__actions">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={researchingId === vehicle.id}
                      onClick={() => handleResearch(vehicle)}
                    >
                      {researchingId === vehicle.id ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        <BsRobot />
                      )}{" "}
                      {t("priceList.research.button")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!dirty || savingId === vehicle.id}
                      onClick={() => handleSave(vehicle)}
                    >
                      {t("priceList.save")}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Modal show={!!research} onHide={() => setResearch(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {t("priceList.research.modalTitle")}
            {research ? ` — ${research.vehicleLabel}` : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {research && (
            <>
              <p className="admin-price-list-page__research-summary">{research.data.summary}</p>
              <div className="admin-price-list-page__research-suggestion">
                <div>
                  <span>{t("priceList.dailyPrice")}</span>
                  <strong>{formatTRY(research.data.dailyPriceTRY)}</strong>
                </div>
                <div>
                  <span>{t("priceList.monthlyPrice")}</span>
                  <strong>{formatTRY(research.data.monthlyPriceTRY)}</strong>
                </div>
                <div>
                  <span>{t("priceList.research.confidence")}</span>
                  <strong>{t(`priceList.research.confidence_${research.data.confidence || "low"}`)}</strong>
                </div>
              </div>
              {Array.isArray(research.data.sources) && research.data.sources.length > 0 && (
                <>
                  <h6 className="admin-price-list-page__research-sources-title">
                    {t("priceList.research.sourcesTitle")}
                  </h6>
                  <ul className="admin-price-list-page__research-sources">
                    {research.data.sources.map((source, index) => (
                      <li key={index}>
                        <strong>{source.site}</strong>
                        {source.dailyPriceTRY != null && ` — ${t("priceList.dailyPrice")}: ${formatTRY(source.dailyPriceTRY)}`}
                        {source.monthlyPriceTRY != null && ` — ${t("priceList.monthlyPrice")}: ${formatTRY(source.monthlyPriceTRY)}`}
                        {source.url && (
                          <>
                            {" — "}
                            <a href={source.url} target="_blank" rel="noreferrer">
                              {t("priceList.research.sourceLink")}
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setResearch(null)}>
            {t("priceList.research.close")}
          </Button>
          <Button onClick={applyResearch}>{t("priceList.research.apply")}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminPriceListPage;
