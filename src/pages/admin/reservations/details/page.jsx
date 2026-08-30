import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Form, Modal, Nav, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { ContractRecords, CustomForm, Loading } from "../../../../components";
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
  returnExtraAmount: "",
  discount: "",
  discountIsPercent: false,
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
      returnExtraAmount: values.returnExtraAmount,
      discount: values.discount,
      discountIsPercent: values.discountIsPercent,
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
        returnExtraAmount: reservation.returnExtraAmount ?? "",
        discount: reservation.discount ?? "",
        discountIsPercent: reservation.discountIsPercent ?? false,
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
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
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
    const v = formik.values;
    const rental = n(v.dailyPrice) * billableDays;
    const base = rental + n(v.extrasTotal) + n(v.oneWayFee) + n(v.returnExtraAmount);
    const discountAmount = v.discountIsPercent ? (base * n(v.discount)) / 100 : n(v.discount);
    const subtotal = base - discountAmount;
    const vat = v.vatRate === "" ? 20 : n(v.vatRate);
    const total = subtotal * (1 + vat / 100);
    return { rental, base, discountAmount, subtotal, total };
  }, [formik.values, billableDays]);

  const collected = 0; // payments — Phase 5
  const extensionTotal = 0; // extensions — Phase 7

  const branchNames = branches.map((b) => b.name);
  const vehicleOptions = vehicles.map((veh) => ({
    id: veh.id,
    value: veh.id,
    name: `${veh.brand} ${veh.model} — ${veh.licensePlate}`,
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
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const priceInput = (name, label) => (
    <div className="contract-page__price-row">
      <label>{label}</label>
      <Form.Control type="number" value={formik.values[name]} onChange={setV(name)} />
    </div>
  );
  const priceRO = (label, value, strong) => (
    <div className={`contract-page__price-row${strong ? " contract-page__price-row--total" : ""}`}>
      <label>{label}</label>
      <span>{value}</span>
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

      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="contract-page__grid">
          {/* LEFT */}
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

          {/* RIGHT */}
          <section className="contract-card">
            <Nav variant="tabs" activeKey={tab} onSelect={(k) => k && setTab(k)} className="mb-3">
              <Nav.Item><Nav.Link eventKey="customer">{c("tabs.customer")}</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="drivers">{c("tabs.drivers")}</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="summary">{c("tabs.summary")}</Nav.Link></Nav.Item>
            </Nav>

            {tab === "customer" && (
              <>
                <div className="contract-page__radios mb-2">
                  <Form.Check inline type="radio" id="ctype-individual" label={c("individual")}
                    checked={customerType === "individual"} onChange={() => setCustomerType("individual")} />
                  <Form.Check inline type="radio" id="ctype-corporate" label={c("corporate")}
                    checked={customerType === "corporate"} onChange={() => setCustomerType("corporate")} />
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
                    <Form.Control list="corp-list" autoComplete="off" placeholder={c("corporateSearch")}
                      defaultValue={selectedCorp?.title || ""}
                      onChange={(e) => {
                        const match = corporates.find((cx) => cx.title === e.target.value);
                        formik.setFieldValue("corporateId", match ? match.id : "");
                      }}
                      className="mb-2" />
                    <datalist id="corp-list">
                      {corporates.map((cx) => <option key={cx.id} value={cx.title} />)}
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

            {tab === "drivers" && (
              <ContractRecords
                reservationId={reservationId}
                resource="drivers"
                initial={{ firstName: "", lastName: "", licenseNo: "", licenseDate: "", birthDate: "", phone: "" }}
                columns={[
                  { key: "firstName", label: c("drivers.firstName") },
                  { key: "lastName", label: c("drivers.lastName") },
                  { key: "licenseNo", label: c("drivers.licenseNo") },
                  { key: "phone", label: c("drivers.phone") },
                ]}
                fields={[
                  { name: "firstName", label: c("drivers.firstName") },
                  { name: "lastName", label: c("drivers.lastName") },
                  { name: "licenseNo", label: c("drivers.licenseNo") },
                  { name: "licenseDate", label: c("drivers.licenseDate"), type: "date" },
                  { name: "birthDate", label: c("drivers.birthDate"), type: "date" },
                  { name: "phone", label: c("drivers.phone") },
                ]}
                labels={{
                  actions: c("records.actions"),
                  add: c("records.add"),
                  save: c("records.save"),
                  cancel: c("records.cancel"),
                  edit: c("records.edit"),
                  delete: c("records.delete"),
                  empty: c("records.empty"),
                  error: c("records.error"),
                  deleteConfirm: c("records.deleteConfirm"),
                  deleteConfirmText: c("records.deleteConfirmText"),
                }}
              />
            )}

            {tab === "summary" && (
              <>
                {ro(c("currentVehicle"), selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.licensePlate})` : "")}
                {ro("Alış - Bırakış", `${formik.values.pickUpDate} ${formik.values.pickUpTime} → ${formik.values.dropOffDate} ${formik.values.dropOffTime} (${c("durationDays").replace("{{count}}", billableDays)})`)}
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
        </div>

        {/* BOTTOM — pricing / payment */}
        <section className="contract-card contract-page__pricing">
          <h3>{c("pricingTitle")}</h3>
          <div className="contract-page__price-grid">
            {priceInput("dailyPrice", c("dailyPrice"))}
            {priceRO(c("rentalAmount"), `${money(pricing.rental)} TL`)}
            {priceInput("extrasTotal", c("extrasTotal"))}
            {priceInput("oneWayFee", c("oneWayFee"))}
            {priceInput("returnExtraAmount", c("returnExtraAmount"))}
            {priceRO(c("subtotal"), `${money(pricing.base)} TL`)}

            <div className="contract-page__price-row">
              <label>{c("discount")}</label>
              <div className="contract-page__discount">
                <Form.Check inline type="radio" id="disc-flat" label={c("discountFlat")}
                  checked={!formik.values.discountIsPercent}
                  onChange={() => formik.setFieldValue("discountIsPercent", false)} />
                <Form.Check inline type="radio" id="disc-pct" label={c("discountPercent")}
                  checked={formik.values.discountIsPercent}
                  onChange={() => formik.setFieldValue("discountIsPercent", true)} />
                <Form.Control type="number" value={formik.values.discount} onChange={setV("discount")} />
              </div>
            </div>

            {priceInput("vatRate", c("vatRate"))}

            <div className="contract-page__price-row">
              <label>{c("kmLimit")}</label>
              <div className="contract-page__km">
                <Form.Control type="number" value={formik.values.kmLimit} onChange={setV("kmLimit")}
                  disabled={formik.values.unlimitedKm} />
                <Form.Check type="checkbox" id="unlimitedKm" label={c("unlimitedKm")}
                  checked={formik.values.unlimitedKm}
                  onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)} />
              </div>
            </div>

            {priceRO(c("uzatmaAmount"), `${money(extensionTotal)} TL`)}
            {priceRO(c("contractAmount"), `${money(pricing.subtotal)} TL`)}
            {priceRO(c("grandTotal"), `${money(pricing.total)} TL`, true)}
            {priceInput("deposit", c("deposit"))}
          </div>
          <div className="contract-page__price-actions">
            <Button type="submit" variant="outline-primary" size="sm" disabled={updating}>
              {c("calc")}
            </Button>
          </div>
        </section>

        <div className="contract-page__balance">
          <strong>{money(collected - pricing.total)} TL</strong>
          <span>{c("balance").toUpperCase()}</span>
        </div>

        <div className="contract-page__actions">
          <Button variant="info" type="button"
            onClick={() => utils.functions.swalToast(t("alertBar.comingSoonToast"), "info")}>
            {c("vehicleReturn")}
          </Button>
          <span className="contract-page__actions-spacer" />
          <Button variant="outline-danger" type="button" disabled={deleting || updating} onClick={handleDelete}>
            {deleting && <Spinner animation="border" size="sm" />} {c("cancelContract")}
          </Button>
          <Button variant="warning" type="button" onClick={() => window.print()}>
            {c("print")}
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
              <Form.Control value={corpForm[field]}
                onChange={(e) => setCorpForm({ ...corpForm, [field]: e.target.value })} />
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
