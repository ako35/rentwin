import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Table } from "react-bootstrap";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

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
                  <td>
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
    </div>
  );
};

export default AdminPriceListPage;
