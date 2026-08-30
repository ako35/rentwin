import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Nav, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { CustomForm, Loading } from "../../../../components";
import "./style.scss";

const { routes } = constants;

const EMPTY = {
  pickUpLocation: "",
  dropOffLocation: "",
  pickUpDate: "",
  pickUpTime: "",
  dropOffDate: "",
  dropOffTime: "",
  carId: "",
  status: "",
  userId: "",
  corporateId: "",
  customerNote: "",
  adminNote: "",
  referenceNo: "",
  flightNo: "",
  dailyPrice: "",
  extrasTotal: "",
  oneWayFee: "",
  discount: "",
  deposit: "",
  kmLimit: "",
  unlimitedKm: true,
  vatRate: 20,
};

const EMPTY_CORPORATE = { title: "", taxOffice: "", taxNo: "", phone: "", email: "" };

const AdminReservationDetailsPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [corporates, setCorporates] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [meta, setMeta] = useState({});
  const [initialValues, setInitialValues] = useState(EMPTY);
  const [tab, setTab] = useState("customer");
  const [customerType, setCustomerType] = useState("individual");
  const [corpModal, setCorpModal] = useState(false);
  const [corpForm, setCorpForm] = useState(EMPTY_CORPORATE);
  const [savingCorp, setSavingCorp] = useState(false);

  const money = (value) =>
    Number(value || 0).toLocaleString(i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
      dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation,
      status: values.status,
      corporateId: customerType === "corporate" ? values.corporateId || "" : "",
      customerNote: values.customerNote,
      adminNote: values.adminNote,
      referenceNo: values.referenceNo,
      flightNo: values.flightNo,
      dailyPrice: values.dailyPrice,
      extrasTotal: values.extrasTotal,
      oneWayFee: values.oneWayFee,
      discount: values.discount,
      deposit: values.deposit,
      kmLimit: values.unlimitedKm ? "" : values.kmLimit,
      unlimitedKm: values.unlimitedKm,
      vatRate: values.vatRate,
    };
    try {
      await services.reservation.updateReservation(values.carId, reservationId, dto);
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
      loadData();
    } catch (error) {
      utils.functions.swalToast(t("reservations.toasts.updateError"), "error");
    } finally {
      setUpdating(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminReservationDetailsFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const loadData = async () => {
    try {
      const [reservation, vehiclesData, branchesData, corporatesData] = await Promise.all([
        services.reservation.getReservationByIdAdmin(reservationId),
        services.vehicle.getVehicles(),
        services.branch.getBranches().catch(() => []),
        services.corporate.getCorporates().catch(() => []),
      ]);
      setVehicles(vehiclesData || []);
      setBranches(branchesData || []);
      setCorporates(corporatesData || []);
      setCustomer(reservation.customer || null);
      setCustomerType(reservation.corporateId ? "corporate" : "individual");
      setMeta({ createdAt: reservation.createdAt, updatedAt: reservation.updatedAt });
      setInitialValues({
        ...EMPTY,
        ...reservation,
        corporateId: reservation.corporateId || "",
        pickUpDate: utils.functions.getDate(reservation.pickUpTime),
        pickUpTime: utils.functions.getTime(reservation.pickUpTime),
        dropOffDate: utils.functions.getDate(reservation.dropOffTime),
        dropOffTime: utils.functions.getTime(reservation.dropOffTime),
        customerNote: reservation.customerNote || "",
        adminNote: reservation.adminNote || "",
        referenceNo: reservation.referenceNo || "",
        flightNo: reservation.flightNo || "",
        dailyPrice: reservation.dailyPrice ?? "",
        extrasTotal: reservation.extrasTotal ?? "",
        oneWayFee: reservation.oneWayFee ?? "",
        discount: reservation.discount ?? "",
        deposit: reservation.deposit ?? "",
        kmLimit: reservation.kmLimit ?? "",
        unlimitedKm: reservation.unlimitedKm ?? true,
        vatRate: reservation.vatRate ?? 20,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = () => {
    utils.functions
      .swalQuestion(
        t("reservations.toasts.deleteConfirmTitle"),
        t("reservations.toasts.deleteConfirmText")
      )
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setDeleting(true);
        try {
          await services.reservation.deleteReservation(reservationId);
          await utils.functions.swalToast(t("reservations.toasts.deleteSuccess"), "success");
          navigate(routes.adminReservations);
        } catch (error) {
          utils.functions.swalToast(t("reservations.toasts.deleteError"), "error");
        } finally {
          setDeleting(false);
        }
      });
  };

  const saveCorporate = async () => {
    if (!corpForm.title.trim()) return;
    setSavingCorp(true);
    try {
      const created = await services.corporate.addCorporate(corpForm);
      const list = await services.corporate.getCorporates();
      setCorporates(list);
      formik.setFieldValue("corporateId", created.id);
      setCorpModal(false);
      setCorpForm(EMPTY_CORPORATE);
    } catch (error) {
      utils.functions.swalToast(t("reservations.toasts.updateError"), "error");
    } finally {
      setSavingCorp(false);
    }
  };

  const selectedCar = useMemo(
    () => vehicles.find((v) => v.id === formik.values.carId),
    [vehicles, formik.values.carId]
  );
  const selectedCorp = corporates.find((cx) => cx.id === formik.values.corporateId);

  const billableDays = useMemo(() => {
    const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
    if (!pickUpDate || !dropOffDate) return 1;
    const start = moment(`${pickUpDate} ${pickUpTime || "00:00"}`);
    const end = moment(`${dropOffDate} ${dropOffTime || "00:00"}`);
    return Math.max(1, Math.ceil(end.diff(start, "hours") / 24));
  }, [formik.values]);

  const pricing = useMemo(() => {
    const n = (v) => Number(v) || 0;
    const rental = n(formik.values.dailyPrice) * billableDays;
    const subtotal =
      rental + n(formik.values.extrasTotal) + n(formik.values.oneWayFee) - n(formik.values.discount);
    const vat = formik.values.vatRate === "" ? 20 : n(formik.values.vatRate);
    const total = subtotal * (1 + vat / 100);
    return { rental, subtotal, total };
  }, [formik.values, billableDays]);

  const branchNames = branches.map((b) => b.name);
  const vehicleOptions = vehicles.map((v) => ({
    id: v.id,
    value: v.id,
    name: `${v.brand} ${v.model} — ${v.licensePlate}`,
  }));
  const statusOptions = constants.reservationStatus.map((s) => ({
    ...s,
    name: tCommon(`options.reservationStatus.${s.value}`),
  }));

  if (loading) return <Loading />;

  const c = (key) => t(`reservations.contract.${key}`);
  const ro = (label, value) => (
    <div className="contract-page__ro">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );

  return (
    <div className="contract-page">
      <div className="contract-page__ribbon">
        <div>
          <span className="contract-page__ribbon-id">
            {c("title")} #{reservationId.slice(0, 10).toUpperCase()}
          </span>
          <span className="contract-page__ribbon-status">
            {tCommon(`options.reservationStatus.${formik.values.status}`)}
          </span>
        </div>
        <div className="contract-page__ribbon-meta">
          {meta.updatedAt && `${c("lastUpdated")}: ${utils.functions.formatDateTime(meta.updatedAt)}`}
        </div>
      </div>

      <Form noValidate onSubmit={formik.handleSubmit} className="contract-page__grid">
        {/* LEFT — pickup/dropoff + vehicle */}
        <section className="contract-card">
          <h3>{c("leftTitle")}</h3>

          <CustomForm formik={formik} name="pickUpLocation" label={c("pickUpLocation")} list={branchNames} />
          <CustomForm formik={formik} name="dropOffLocation" label={c("dropOffLocation")} list={branchNames} />

          <div className="contract-page__pair">
            <CustomForm formik={formik} name="pickUpDate" label={c("pickUpDate")} type="date" />
            <CustomForm formik={formik} name="pickUpTime" label={t("reservations.form.pickUpTime")} type="time" />
          </div>
          <div className="contract-page__pair">
            <CustomForm formik={formik} name="dropOffDate" label={c("dropOffDate")} type="date" />
            <CustomForm formik={formik} name="dropOffTime" label={t("reservations.form.dropOffTime")} type="time" />
          </div>

          {ro(c("duration"), c("durationDays").replace("{{count}}", billableDays))}

          <CustomForm formik={formik} name="carId" label={c("vehicle")} type="select" itemsArr={vehicleOptions} />

          {ro(c("class"), selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "")}
          {ro(
            c("fuelTransmission"),
            selectedCar
              ? `${tCommon(`options.fuelTypes.${selectedCar.fuelType}`)} / ${tCommon(
                  `options.transmissionTypes.${selectedCar.transmission}`
                )}`
              : ""
          )}
          {ro(c("plate"), selectedCar?.licensePlate)}
        </section>

        {/* RIGHT — tabs */}
        <section className="contract-card">
          <Nav variant="tabs" activeKey={tab} onSelect={(k) => k && setTab(k)} className="mb-3">
            <Nav.Item><Nav.Link eventKey="customer">{c("tabs.customer")}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="pricing">{c("tabs.pricing")}</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="summary">{c("tabs.summary")}</Nav.Link></Nav.Item>
          </Nav>

          {tab === "customer" && (
            <>
              <div className="contract-page__radios mb-2">
                <Form.Check
                  inline
                  type="radio"
                  id="ctype-individual"
                  label={c("individual")}
                  checked={customerType === "individual"}
                  onChange={() => setCustomerType("individual")}
                />
                <Form.Check
                  inline
                  type="radio"
                  id="ctype-corporate"
                  label={c("corporate")}
                  checked={customerType === "corporate"}
                  onChange={() => setCustomerType("corporate")}
                />
              </div>

              {ro(c("customerName"), customer ? `${customer.firstName} ${customer.lastName}` : "")}
              {ro(c("customerEmail"), customer?.email)}
              {ro(c("customerPhone"), customer?.phoneNumber)}
              {formik.values.userId && (
                <Link className="contract-page__link" to={`${routes.adminUsers}/${formik.values.userId}`}>
                  {c("openCustomer")}
                </Link>
              )}

              {customerType === "corporate" && (
                <>
                  <hr />
                  <div className="contract-page__corp-head">
                    <Form.Label className="mb-0">{c("corporateSelect")}</Form.Label>
                    <button type="button" className="contract-page__link" onClick={() => setCorpModal(true)}>
                      + {c("newCorporate")}
                    </button>
                  </div>
                  <Form.Control
                    list="corp-list"
                    autoComplete="off"
                    placeholder={c("corporateSearch")}
                    defaultValue={selectedCorp?.title || ""}
                    onChange={(e) => {
                      const match = corporates.find((cx) => cx.title === e.target.value);
                      formik.setFieldValue("corporateId", match ? match.id : "");
                    }}
                    className="mb-2"
                  />
                  <datalist id="corp-list">
                    {corporates.map((cx) => (
                      <option key={cx.id} value={cx.title} />
                    ))}
                  </datalist>
                  {selectedCorp && (
                    <>
                      {ro(c("taxOffice"), selectedCorp.taxOffice)}
                      {ro(c("taxNo"), selectedCorp.taxNo)}
                      {ro(c("customerPhone"), selectedCorp.phone)}
                      {ro(c("customerEmail"), selectedCorp.email)}
                    </>
                  )}
                </>
              )}

              <hr />
              <CustomForm formik={formik} name="flightNo" label={c("flightNo")} />
              <CustomForm formik={formik} name="referenceNo" label={c("referenceNo")} />
            </>
          )}

          {tab === "pricing" && (
            <>
              <CustomForm formik={formik} name="dailyPrice" label={c("dailyPrice")} type="number" />
              {ro(
                c("rentalAmount"),
                `${money(formik.values.dailyPrice)} × ${billableDays} ${c("day")} = ${money(pricing.rental)}`
              )}
              <CustomForm formik={formik} name="extrasTotal" label={c("extrasTotal")} type="number" />
              <CustomForm formik={formik} name="oneWayFee" label={c("oneWayFee")} type="number" />
              <CustomForm formik={formik} name="discount" label={c("discount")} type="number" />
              {ro(c("subtotal"), `${money(pricing.subtotal)} TL`)}
              <CustomForm formik={formik} name="vatRate" label={c("vatRate")} type="number" />
              {ro(c("grandTotal"), `${money(pricing.total)} TL`)}
              <hr />
              <CustomForm formik={formik} name="deposit" label={c("deposit")} type="number" />
              <Form.Check
                type="checkbox"
                id="unlimitedKm"
                className="mb-2"
                label={c("unlimitedKm")}
                checked={formik.values.unlimitedKm}
                onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)}
              />
              {!formik.values.unlimitedKm && (
                <CustomForm formik={formik} name="kmLimit" label={c("kmLimit")} type="number" />
              )}
            </>
          )}

          {tab === "summary" && (
            <>
              {ro(
                c("currentVehicle"),
                selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.licensePlate})` : ""
              )}
              {ro(
                "Alış - Bırakış",
                `${formik.values.pickUpDate} ${formik.values.pickUpTime} → ${formik.values.dropOffDate} ${formik.values.dropOffTime} (${c(
                  "durationDays"
                ).replace("{{count}}", billableDays)})`
              )}
              {ro(c("route"), `${formik.values.pickUpLocation || "—"} → ${formik.values.dropOffLocation || "—"}`)}
              {ro(c("customer"), selectedCorp ? selectedCorp.title : customer ? `${customer.firstName} ${customer.lastName}` : "")}
              {ro(c("grandTotal"), `${money(pricing.total)} TL`)}
              {meta.createdAt && ro(c("createdAt"), utils.functions.formatDateTime(meta.createdAt))}
              <CustomForm formik={formik} name="status" label={c("status")} type="select" itemsArr={statusOptions} />
              <hr />
              <CustomForm formik={formik} name="customerNote" label={c("customerNote")} type="textarea" rows={2} />
              <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
            </>
          )}
        </section>

        <div className="contract-page__actions">
          <Button variant="outline-danger" type="button" disabled={deleting || updating} onClick={handleDelete}>
            {deleting && <Spinner animation="border" size="sm" />} {t("reservations.delete")}
          </Button>
          <Button variant="outline-secondary" type="button" onClick={() => navigate(routes.adminReservations)}>
            {t("reservations.cancel")}
          </Button>
          <Button type="submit" disabled={!(formik.isValid && formik.dirty) || updating}>
            {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
          </Button>
        </div>
      </Form>

      <Modal show={corpModal} onHide={() => setCorpModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{c("newCorporate")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {[
            ["title", "corporateTitle"],
            ["taxOffice", "taxOffice"],
            ["taxNo", "taxNo"],
            ["phone", "customerPhone"],
            ["email", "customerEmail"],
          ].map(([field, labelKey]) => (
            <Form.Group className="mb-2" key={field}>
              <Form.Label>{c(labelKey)}</Form.Label>
              <Form.Control
                value={corpForm[field]}
                onChange={(e) => setCorpForm({ ...corpForm, [field]: e.target.value })}
              />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCorpModal(false)}>
            {t("reservations.cancel")}
          </Button>
          <Button onClick={saveCorporate} disabled={savingCorp || !corpForm.title.trim()}>
            {savingCorp && <Spinner animation="border" size="sm" />} {t("reservations.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminReservationDetailsPage;
