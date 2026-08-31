import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { Loading } from "../../../../components";
import "./style.scss";

const { routes } = constants;

const AdminNewContractPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    carId: "",
    userId: "",
    pickUpLocation: "",
    dropOffLocation: "",
    pickUpDate: moment().format("YYYY-MM-DD"),
    pickUpTime: "10:00",
    dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
    dropOffTime: "10:00",
  });

  useEffect(() => {
    Promise.all([
      services.vehicle.getVehicles(),
      services.user.getUsersByPage(0, 200),
      services.branch.getBranches().catch(() => []),
    ])
      .then(([v, u, b]) => {
        setVehicles(v || []);
        setCustomers((u?.content || []).filter((x) => x.roles?.includes("Customer")));
        setBranches(b || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const selectedCar = useMemo(() => vehicles.find((v) => v.id === form.carId), [vehicles, form.carId]);

  const canSubmit =
    form.carId &&
    form.userId &&
    form.pickUpDate &&
    form.dropOffDate &&
    moment(`${form.dropOffDate} ${form.dropOffTime}`).isAfter(
      moment(`${form.pickUpDate} ${form.pickUpTime}`)
    );

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id } = await services.reservation.createReservationAdmin({
        carId: form.carId,
        userId: form.userId,
        pickUpLocation: form.pickUpLocation,
        dropOffLocation: form.dropOffLocation || form.pickUpLocation,
        pickUpTime: utils.functions.combineDateAndTime(form.pickUpDate, form.pickUpTime),
        dropOffTime: utils.functions.combineDateAndTime(form.dropOffDate, form.dropOffTime),
      });
      navigate(`${routes.adminReservations}/${id}`);
    } catch (error) {
      utils.functions.swalToast(t("newContract.error"), "error");
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const branchNames = branches.map((b) => b.name);

  return (
    <div className="new-contract-page">
      <h2>{t("newContract.title")}</h2>
      <form className="new-contract-page__card" onSubmit={submit}>
        <Form.Group className="mb-3">
          <Form.Label>{t("newContract.vehicle")}</Form.Label>
          <Form.Select value={form.carId} onChange={set("carId")}>
            <option value="">{t("newContract.selectVehicle")}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.licensePlate} — {v.brand} {v.model}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {selectedCar && (
          <div className="new-contract-page__vehicle-info">
            {selectedCar.brand} {selectedCar.model} ·{" "}
            {t(`options.fuelTypes.${selectedCar.fuelType}`, { ns: "common" })}
          </div>
        )}

        <Form.Group className="mb-3">
          <Form.Label>{t("newContract.customer")}</Form.Label>
          <Form.Select value={form.userId} onChange={set("userId")}>
            <option value="">{t("newContract.selectCustomer")}</option>
            {customers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} — {u.email}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <div className="new-contract-page__grid">
          <Form.Group>
            <Form.Label>{t("reservations.contract.pickUpLocation")}</Form.Label>
            <Form.Control list="nc-branches" value={form.pickUpLocation} onChange={set("pickUpLocation")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("reservations.contract.dropOffLocation")}</Form.Label>
            <Form.Control list="nc-branches" value={form.dropOffLocation} onChange={set("dropOffLocation")} />
          </Form.Group>
          <datalist id="nc-branches">
            {branchNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <Form.Group>
            <Form.Label>{t("reservations.contract.pickUpDate")}</Form.Label>
            <Form.Control type="date" value={form.pickUpDate} onChange={set("pickUpDate")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("reservations.form.pickUpTime")}</Form.Label>
            <Form.Control type="time" value={form.pickUpTime} onChange={set("pickUpTime")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("reservations.contract.dropOffDate")}</Form.Label>
            <Form.Control type="date" value={form.dropOffDate} min={form.pickUpDate} onChange={set("dropOffDate")} />
          </Form.Group>
          <Form.Group>
            <Form.Label>{t("reservations.form.dropOffTime")}</Form.Label>
            <Form.Control type="time" value={form.dropOffTime} onChange={set("dropOffTime")} />
          </Form.Group>
        </div>

        <div className="new-contract-page__actions">
          <Button variant="outline-secondary" type="button" onClick={() => navigate(routes.adminReservations)}>
            {t("reservations.cancel")}
          </Button>
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving && <Spinner animation="border" size="sm" />} {t("newContract.create")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminNewContractPage;
