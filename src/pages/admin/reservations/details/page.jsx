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
  pickUpLocation: "", dropOffLocation: "", pickUpDate: "", pickUpTime: "",
  dropOffDate: "", dropOffTime: "", carId: "", status: "", userId: "", corporateId: "",
  customerNote: "", adminNote: "", referenceNo: "", flightNo: "",
  dailyPrice: "", extrasTotal: "", oneWayFee: "", returnExtraAmount: "",
  discount: "", discountIsPercent: false, discountDailyOnly: true,
  deposit: "", kmLimit: "", unlimitedKm: true, vatRate: 20,
};
const EMPTY_CORP = { title: "", taxOffice: "", taxNo: "", phone: "", email: "" };

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
  const [topTab, setTopTab] = useState("customer");
  const [subTab, setSubTab] = useState("summary");
  const [customerType, setCustomerType] = useState("individual");
  const [corpModal, setCorpModal] = useState(false);
  const [corpForm, setCorpForm] = useState(EMPTY_CORP);
  const [savingCorp, setSavingCorp] = useState(false);
  const [payments, setPayments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [extForm, setExtForm] = useState({ date: "", time: "", extraAmount: "", note: "" });
  const [extending, setExtending] = useState(false);
  const [invoicing, setInvoicing] = useState(false);

  const money = (v) =>
    Number(v || 0).toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const loadPayments = () =>
    services.reservation.getRecords(reservationId, "payments")
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]));

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = {
      pickUpTime: utils.functions.combineDateAndTime(values.pickUpDate, values.pickUpTime),
      dropOffTime: utils.functions.combineDateAndTime(values.dropOffDate, values.dropOffTime),
      pickUpLocation: values.pickUpLocation,
      dropOffLocation: values.dropOffLocation,
      status: values.status,
      corporateId: customerType === "corporate" ? values.corporateId || "" : "",
      customerNote: values.customerNote, adminNote: values.adminNote,
      referenceNo: values.referenceNo, flightNo: values.flightNo,
      dailyPrice: values.dailyPrice, extrasTotal: values.extrasTotal,
      oneWayFee: values.oneWayFee, returnExtraAmount: values.returnExtraAmount,
      discount: values.discount, discountIsPercent: values.discountIsPercent,
      discountDailyOnly: values.discountDailyOnly,
      deposit: values.deposit, kmLimit: values.unlimitedKm ? "" : values.kmLimit,
      unlimitedKm: values.unlimitedKm, vatRate: values.vatRate,
    };
    try {
      await services.reservation.updateReservation(values.carId, reservationId, dto);
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
      loadData();
    } catch {
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
      const [r, v, b, cs, cat] = await Promise.all([
        services.reservation.getReservationByIdAdmin(reservationId),
        services.vehicle.getVehicles(),
        services.branch.getBranches().catch(() => []),
        services.corporate.getCorporates().catch(() => []),
        services.extra.getExtras().catch(() => []),
      ]);
      setVehicles(v || []);
      setBranches(b || []);
      setCorporates(cs || []);
      setCatalog(cat || []);
      setExtensions(r.extensions || []);
      setInvoice(r.invoice || null);
      loadPayments();
      setCustomer(r.customer || null);
      setCustomerType(r.corporateId ? "corporate" : "individual");
      setMeta({ createdAt: r.createdAt, updatedAt: r.updatedAt });
      setInitialValues({
        ...EMPTY, ...r,
        corporateId: r.corporateId || "",
        pickUpDate: utils.functions.getDate(r.pickUpTime),
        pickUpTime: utils.functions.getTime(r.pickUpTime),
        dropOffDate: utils.functions.getDate(r.dropOffTime),
        dropOffTime: utils.functions.getTime(r.dropOffTime),
        customerNote: r.customerNote || "", adminNote: r.adminNote || "",
        referenceNo: r.referenceNo || "", flightNo: r.flightNo || "",
        dailyPrice: r.dailyPrice ?? "", extrasTotal: r.extrasTotal ?? "",
        oneWayFee: r.oneWayFee ?? "", returnExtraAmount: r.returnExtraAmount ?? "",
        discount: r.discount ?? "", discountIsPercent: r.discountIsPercent ?? false,
        discountDailyOnly: r.discountDailyOnly ?? true,
        deposit: r.deposit ?? "", kmLimit: r.kmLimit ?? "",
        unlimitedKm: r.unlimitedKm ?? true, vatRate: r.vatRate ?? 20,
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
      .swalQuestion(t("reservations.toasts.deleteConfirmTitle"), t("reservations.toasts.deleteConfirmText"))
      .then(async (res) => {
        if (!res.isConfirmed) return;
        setDeleting(true);
        try {
          await services.reservation.deleteReservation(reservationId);
          await utils.functions.swalToast(t("reservations.toasts.deleteSuccess"), "success");
          navigate(routes.adminReservations);
        } catch {
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
      setCorporates(await services.corporate.getCorporates());
      formik.setFieldValue("corporateId", created.id);
      setCorpModal(false);
      setCorpForm(EMPTY_CORP);
    } catch {
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
    const s = moment(`${pickUpDate} ${pickUpTime || "00:00"}`);
    const e = moment(`${dropOffDate} ${dropOffTime || "00:00"}`);
    return Math.max(1, Math.ceil(e.diff(s, "hours") / 24));
  }, [formik.values]);

  const extensionTotal = extensions.reduce((s, e) => s + (Number(e.extraAmount) || 0), 0);
  const extensionDays = extensions.reduce((s, e) => s + (Number(e.extraDays) || 0), 0);
  const collected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const pricing = useMemo(() => {
    const n = (x) => Number(x) || 0;
    const v = formik.values;
    const rental = n(v.dailyPrice) * billableDays;
    const addOns = n(v.extrasTotal) + n(v.oneWayFee) + n(v.returnExtraAmount);
    const discBase = v.discountDailyOnly ? rental : rental + addOns;
    const discAmount = v.discountIsPercent ? (discBase * n(v.discount)) / 100 : n(v.discount);
    const subtotal = rental + addOns - discAmount;
    const vat = v.vatRate === "" ? 20 : n(v.vatRate);
    const total = subtotal * (1 + vat / 100);
    return { rental, addOns, subtotal, total };
  }, [formik.values, billableDays]);

  const doExtend = async () => {
    if (!extForm.date) return;
    setExtending(true);
    try {
      await services.reservation.extendReservation(reservationId, {
        newDropOff: utils.functions.combineDateAndTime(extForm.date, extForm.time || "10:00"),
        extraAmount: extForm.extraAmount, note: extForm.note,
      });
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
      setExtForm({ date: "", time: "", extraAmount: "", note: "" });
      loadData();
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setExtending(false);
    }
  };

  const doInvoice = async () => {
    setInvoicing(true);
    try {
      setInvoice(await services.reservation.createInvoice(reservationId));
      utils.functions.swalToast(t("reservations.toasts.updateSuccess"), "success");
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setInvoicing(false);
    }
  };

  const branchNames = branches.map((b) => b.name);
  const vehicleOptions = vehicles.map((veh) => ({
    id: veh.id, value: veh.id, name: `${veh.brand} ${veh.model} — ${veh.licensePlate}`,
  }));
  const statusOptions = constants.reservationStatus.map((s) => ({
    ...s, name: tCommon(`options.reservationStatus.${s.value}`),
  }));
  const recordLabels = {
    actions: t("reservations.contract.records.actions"),
    add: t("reservations.contract.records.add"),
    save: t("reservations.contract.records.save"),
    cancel: t("reservations.contract.records.cancel"),
    edit: t("reservations.contract.records.edit"),
    delete: t("reservations.contract.records.delete"),
    empty: t("reservations.contract.records.empty"),
    error: t("reservations.contract.records.error"),
    deleteConfirm: t("reservations.contract.records.deleteConfirm"),
    deleteConfirmText: t("reservations.contract.records.deleteConfirmText"),
  };

  if (loading) return <Loading />;

  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const ro = (label, value) => (
    <div className="contract-page__ro"><span>{label}</span><strong>{value || "—"}</strong></div>
  );
  const setV = (name) => (e) => formik.setFieldValue(name, e.target.value);
  const priceInput = (name, label, suffix = "TL") => (
    <div className="contract-page__price-row">
      <label>{label}</label>
      <span className="contract-page__price-input">
        <Form.Control type="number" size="sm" value={formik.values[name]} onChange={setV(name)} />
        {suffix}
      </span>
    </div>
  );
  const priceRO = (label, value, kind) => (
    <div className={`contract-page__price-row${kind ? ` contract-page__price-row--${kind}` : ""}`}>
      <label>{label}</label><span>{value}</span>
    </div>
  );

  return (
    <div className="contract-page">
      <div className="contract-page__ribbon">
        <div className="contract-page__ribbon-main">
          <span className="contract-page__ribbon-id">
            {c("title")} # {reservationId.slice(0, 10).toUpperCase()}
          </span>
          {formik.values.referenceNo && (
            <span className="contract-page__ribbon-ref">
              ({c("contractNo")}: # {formik.values.referenceNo})
            </span>
          )}
        </div>
        <div className="contract-page__ribbon-title">{c("detailTitle")}</div>
        <div className="contract-page__ribbon-meta">
          {meta.updatedAt && (
            <>
              📅 {utils.functions.formatDateTime(meta.updatedAt)}
              <br />
              {c("lastUpdated")}: {utils.functions.formatDateTime(meta.updatedAt)}
            </>
          )}
        </div>
      </div>

      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="contract-page__grid">
          {/* ---------- LEFT ---------- */}
          <div className="contract-page__col">
            <section className="contract-card">
              <h3>{c("leftTitle")}</h3>
              <CustomForm formik={formik} name="pickUpLocation" label={`* ${c("pickUpLocation")}`} list={branchNames} />
              <CustomForm formik={formik} name="dropOffLocation" label={`* ${c("dropOffLocation")}`} list={branchNames} />
              <div className="contract-page__pair">
                <CustomForm formik={formik} name="pickUpDate" label={`* ${c("pickUpDate")}`} type="date" />
                <CustomForm formik={formik} name="pickUpTime" label={t("reservations.form.pickUpTime")} type="time" />
              </div>
              <div className="contract-page__pair">
                <CustomForm formik={formik} name="dropOffDate" label={`* ${c("dropOffDate")}`} type="date" />
                <CustomForm formik={formik} name="dropOffTime" label={t("reservations.form.dropOffTime")} type="time" />
              </div>
              {ro(c("kur"), c("kurLine", { c: "1,00 TL", g: "1,00 TL" }))}
              {ro(c("currentClass"), selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "")}
              <CustomForm formik={formik} name="carId" label={c("vehicle")} type="select" itemsArr={vehicleOptions} />
              {ro(
                c("fuelTransmission"),
                selectedCar
                  ? `${tCommon(`options.fuelTypes.${selectedCar.fuelType}`)} / ${tCommon(`options.transmissionTypes.${selectedCar.transmission}`)}`
                  : ""
              )}
              {ro(c("plate"), selectedCar?.licensePlate)}
            </section>

            <section className="contract-card">
              <h3>{c("ekstralarTitle")}</h3>
              <ContractRecords
                reservationId={reservationId}
                resource="extras"
                onChange={loadData}
                catalog={catalog.map((x) => ({
                  label: `${x.name} (${x.unitPrice} TL${x.perDay ? "/gün" : ""})`,
                  values: { name: x.name, unitPrice: x.unitPrice, perDay: x.perDay, quantity: 1 },
                }))}
                initial={{ name: "", unitPrice: "", perDay: true, quantity: 1 }}
                columns={[
                  { key: "name", label: c("extrasFields.name") },
                  { key: "unitPrice", label: c("extrasFields.unitPrice"), kind: "money" },
                  { key: "quantity", label: c("extrasFields.quantity") },
                ]}
                fields={[
                  { name: "name", label: c("extrasFields.name") },
                  { name: "unitPrice", label: c("extrasFields.unitPrice"), type: "number" },
                  { name: "quantity", label: c("extrasFields.quantity"), type: "number" },
                ]}
                labels={recordLabels}
                footer={
                  <div className="contract-page__ro" style={{ marginTop: "0.5rem" }}>
                    <span>{c("extrasTotal")}</span>
                    <strong>{money(formik.values.extrasTotal)} TL</strong>
                  </div>
                }
              />
            </section>
          </div>

          {/* ---------- RIGHT ---------- */}
          <div className="contract-page__col">
            <section className="contract-card">
              {/* top tabs */}
              <Nav variant="tabs" activeKey={topTab} onSelect={(k) => k && setTopTab(k)} className="mb-3">
                <Nav.Item><Nav.Link eventKey="customer">{c("topTabs.customer")}</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="drivers">{c("topTabs.drivers")}</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="invoice">{c("topTabs.invoice")}</Nav.Link></Nav.Item>
              </Nav>

              {topTab === "customer" && (
                <div className="contract-page__top-content">
                  <div className="contract-page__radios mb-2">
                    <Form.Check inline type="radio" id="ct-ind" label={c("individual")}
                      checked={customerType === "individual"} onChange={() => setCustomerType("individual")} />
                    <Form.Check inline type="radio" id="ct-corp" label={c("corporate")}
                      checked={customerType === "corporate"} onChange={() => setCustomerType("corporate")} />
                  </div>
                  {customerType === "individual" ? (
                    <>
                      {ro(c("customerName"), customer ? `${customer.firstName} ${customer.lastName}` : "")}
                      {ro(c("customerEmail"), customer?.email)}
                      {ro(c("customerPhone"), customer?.phoneNumber)}
                      {formik.values.userId && (
                        <Link className="contract-page__link" to={`${routes.adminUsers}/${formik.values.userId}`}>
                          {c("openCustomer")}
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="contract-page__corp-head">
                        <Form.Label className="mb-0">* {c("corporateTitle")}</Form.Label>
                        <button type="button" className="contract-page__link" onClick={() => setCorpModal(true)}>
                          + {c("newCorporate")}
                        </button>
                      </div>
                      <Form.Control list="corp-list" autoComplete="off" size="sm" placeholder={c("corporateSearch")}
                        defaultValue={selectedCorp?.title || ""}
                        onChange={(e) => {
                          const m = corporates.find((cx) => cx.title === e.target.value);
                          formik.setFieldValue("corporateId", m ? m.id : "");
                        }} className="mb-2" />
                      <datalist id="corp-list">
                        {corporates.map((cx) => <option key={cx.id} value={cx.title} />)}
                      </datalist>
                      {selectedCorp && (
                        <>
                          {ro(c("taxOffice"), selectedCorp.taxOffice)}
                          {ro(`* ${c("taxNo")}`, selectedCorp.taxNo)}
                          {ro(c("customerPhone"), selectedCorp.phone)}
                          {ro(c("customerEmail"), selectedCorp.email)}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {topTab === "drivers" && (
                <div className="contract-page__top-content">
                  <ContractRecords
                    reservationId={reservationId} resource="drivers"
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
                    labels={recordLabels}
                  />
                </div>
              )}

              {topTab === "invoice" && (
                <div className="contract-page__top-content">
                  {invoice ? (
                    <>
                      {ro(c("invoice.number"), invoice.number)}
                      {ro(c("invoice.issuedAt"), utils.functions.getDate(invoice.issuedAt))}
                      {ro(c("invoice.customer"), invoice.customerTitle)}
                      {ro(c("invoice.taxNo"), invoice.taxNo)}
                      {ro(c("invoice.net"), `${money(invoice.netAmount)} TL`)}
                      {ro(c("invoice.tax"), `${money(invoice.taxAmount)} TL`)}
                      {ro(c("invoice.gross"), `${money(invoice.grossAmount)} TL`)}
                      <Button variant="warning" size="sm" className="mt-2" onClick={() => window.print()}>{c("print")}</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-muted">{c("invoice.none")}</p>
                      <Button size="sm" disabled={invoicing} onClick={doInvoice}>
                        {invoicing && <Spinner animation="border" size="sm" />} {c("invoice.create")}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* sub tabs */}
              <Nav variant="pills" activeKey={subTab} onSelect={(k) => k && setSubTab(k)}
                className="contract-page__subtabs mt-3 mb-2">
                {["summary", "deposit", "payments", "returnExtra", "reference", "extension"].map((k) => (
                  <Nav.Item key={k}><Nav.Link eventKey={k}>{c(`subTabs.${k}`)}</Nav.Link></Nav.Item>
                ))}
              </Nav>

              <div className="contract-page__sub-content">
                {subTab === "summary" && (
                  <>
                    {ro(c("currentClass"), selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "")}
                    <div className="contract-page__ro">
                      <span>{c("currentVehicle")}</span>
                      <strong>{selectedCar?.licensePlate || "—"}</strong>
                    </div>
                    {ro(c("pickUpDropOff"),
                      `${formik.values.pickUpDate} ${formik.values.pickUpTime} - ${formik.values.dropOffDate} ${formik.values.dropOffTime} (${c("durationDays", { count: billableDays })})`)}
                    {ro(c("route"), `${formik.values.pickUpLocation || "—"} - ${formik.values.dropOffLocation || "—"}`)}
                    {ro(c("selectedExtras"), formik.values.extrasTotal ? `${money(formik.values.extrasTotal)} TL` : "")}
                    <CustomForm formik={formik} name="flightNo" label={c("flightNo")} />
                    {ro(c("customerName"), selectedCorp ? selectedCorp.title : customer ? `${customer.firstName} ${customer.lastName}` : "")}
                    <CustomForm formik={formik} name="customerNote" label={c("customerNote")} type="textarea" rows={2} />
                    <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
                    <CustomForm formik={formik} name="status" label={c("status")} type="select" itemsArr={statusOptions} />
                  </>
                )}

                {subTab === "deposit" && (
                  <CustomForm formik={formik} name="deposit" label={c("deposit")} type="number" />
                )}

                {subTab === "payments" && (
                  <>
                    <div className="contract-page__pay-summary">
                      {ro(c("grandTotal"), `${money(pricing.total)} TL`)}
                      {ro(c("collected"), `${money(collected)} TL`)}
                      {ro(c("balance"), `${money(collected - pricing.total)} TL`)}
                    </div>
                    <ContractRecords
                      reservationId={reservationId} resource="payments" onChange={loadPayments}
                      initial={{ amount: "", method: "Cash", paidAt: "", note: "" }}
                      columns={[
                        { key: "paidAt", label: c("payments.paidAt"), kind: "date" },
                        { key: "method", label: c("payments.method"), format: (v) => c(`paymentMethods.${v}`) },
                        { key: "amount", label: c("payments.amount"), kind: "money" },
                        { key: "note", label: c("payments.note") },
                      ]}
                      fields={[
                        { name: "amount", label: c("payments.amount"), type: "number" },
                        { name: "method", label: c("payments.method"), type: "select",
                          options: ["Cash", "CreditCard", "Transfer", "Other"].map((m) => ({ value: m, label: c(`paymentMethods.${m}`) })) },
                        { name: "paidAt", label: c("payments.paidAt"), type: "date" },
                        { name: "note", label: c("payments.note") },
                      ]}
                      labels={recordLabels}
                    />
                  </>
                )}

                {subTab === "returnExtra" && (
                  <CustomForm formik={formik} name="returnExtraAmount" label={c("returnExtraAmount")} type="number" />
                )}

                {subTab === "reference" && (
                  <CustomForm formik={formik} name="referenceNo" label={c("referenceNo")} />
                )}

                {subTab === "extension" && (
                  <>
                    <div className="contract-records__form">
                      <div className="contract-records__fields">
                        <Form.Group>
                          <Form.Label>{c("extension.newDropOffDate")}</Form.Label>
                          <Form.Control type="date" size="sm" value={extForm.date} min={formik.values.dropOffDate}
                            onChange={(e) => setExtForm({ ...extForm, date: e.target.value })} />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>{c("extension.newDropOffTime")}</Form.Label>
                          <Form.Control type="time" size="sm" value={extForm.time}
                            onChange={(e) => setExtForm({ ...extForm, time: e.target.value })} />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>{c("extension.extraAmount")}</Form.Label>
                          <Form.Control type="number" size="sm" value={extForm.extraAmount}
                            onChange={(e) => setExtForm({ ...extForm, extraAmount: e.target.value })} />
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>{c("extension.note")}</Form.Label>
                          <Form.Control size="sm" value={extForm.note}
                            onChange={(e) => setExtForm({ ...extForm, note: e.target.value })} />
                        </Form.Group>
                      </div>
                      <div className="contract-records__form-actions">
                        <Button type="button" size="sm" disabled={extending || !extForm.date} onClick={doExtend}>
                          {extending && <Spinner animation="border" size="sm" />} {c("extension.extend")}
                        </Button>
                      </div>
                    </div>
                    {extensions.map((ext) => (
                      <div className="contract-page__ro" key={ext.id}>
                        <span>
                          {c("extension.range", {
                            from: utils.functions.getDate(ext.previousDropOff),
                            to: utils.functions.getDate(ext.newDropOff),
                          })} · {c("extension.days", { count: ext.extraDays })}
                        </span>
                        <strong>{money(ext.extraAmount)} TL</strong>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* pricing block */}
              <div className="contract-page__pricing-block">
                <div className="contract-page__price-row">
                  <label>{c("dailyPrice")}</label>
                  <span className="contract-page__price-input">
                    <Form.Control type="number" size="sm" value={formik.values.dailyPrice} onChange={setV("dailyPrice")} />
                    TL × {billableDays} {c("day")}{extensionDays ? ` (+${extensionDays})` : ""}
                  </span>
                </div>
                {priceRO(c("rentalAmount"), `${money(pricing.rental)} TL`)}
                {priceInput("extrasTotal", c("extrasTotal"))}
                {priceInput("oneWayFee", c("oneWayFee"))}
                {priceRO(c("subtotal"), `${money(pricing.rental + pricing.addOns)} TL`, "blue")}

                <div className="contract-page__price-row">
                  <label>{c("discount")}</label>
                  <span className="contract-page__discount">
                    <Form.Check inline type="radio" id="disc-flat" label={c("discountFlat")}
                      checked={!formik.values.discountIsPercent} onChange={() => formik.setFieldValue("discountIsPercent", false)} />
                    <Form.Check inline type="radio" id="disc-pct" label={c("discountPercent")}
                      checked={formik.values.discountIsPercent} onChange={() => formik.setFieldValue("discountIsPercent", true)} />
                    <Form.Control type="number" size="sm" value={formik.values.discount} onChange={setV("discount")} />
                    <Form.Check type="checkbox" id="disc-daily" label={c("discountDailyOnly")}
                      checked={formik.values.discountDailyOnly}
                      onChange={(e) => formik.setFieldValue("discountDailyOnly", e.target.checked)} />
                  </span>
                </div>

                <div className="contract-page__price-row">
                  <label>{c("kmLimit")}</label>
                  <span className="contract-page__km">
                    <Form.Control type="number" size="sm" value={formik.values.kmLimit} onChange={setV("kmLimit")}
                      disabled={formik.values.unlimitedKm} /> km
                    <Form.Check type="checkbox" id="km-unl" label={c("unlimitedKm")}
                      checked={formik.values.unlimitedKm}
                      onChange={(e) => formik.setFieldValue("unlimitedKm", e.target.checked)} />
                  </span>
                </div>

                {priceRO(c("uzatmaAmount"), `${money(extensionTotal)} TL`)}
                {priceRO(c("returnExtraAmount"), `${money(formik.values.returnExtraAmount)} TL`)}
                {priceInput("vatRate", c("vatRate"), "%")}
                {priceRO(c("contractAmount"), `${money(pricing.subtotal)} TL`)}
                {priceRO(c("totalAmount"), `${money(pricing.total)} TL`, "total")}

                <div className="contract-page__price-actions">
                  <Button type="submit" variant="outline-primary" size="sm" disabled={updating}>{c("recalc")}</Button>
                </div>
              </div>

              <div className="contract-page__balance">
                <strong>{money(collected - pricing.total)} TL</strong>
                <span>{c("balance").toUpperCase()}</span>
              </div>
            </section>
          </div>
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
          <Button variant="warning" type="button" onClick={() => window.print()}>{c("print")}</Button>
          <Button type="submit" disabled={!(formik.isValid && formik.dirty) || updating}>
            {updating && <Spinner animation="border" size="sm" />} {t("reservations.save")}
          </Button>
        </div>
      </Form>

      <Modal show={corpModal} onHide={() => setCorpModal(false)}>
        <Modal.Header closeButton><Modal.Title>{c("newCorporate")}</Modal.Title></Modal.Header>
        <Modal.Body>
          {[["title", "corporateTitle"], ["taxOffice", "taxOffice"], ["taxNo", "taxNo"],
            ["phone", "customerPhone"], ["email", "customerEmail"]].map(([field, lk]) => (
            <Form.Group className="mb-2" key={field}>
              <Form.Label>{c(lk)}</Form.Label>
              <Form.Control value={corpForm[field]} onChange={(e) => setCorpForm({ ...corpForm, [field]: e.target.value })} />
            </Form.Group>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCorpModal(false)}>{t("reservations.cancel")}</Button>
          <Button onClick={saveCorporate} disabled={savingCorp || !corpForm.title.trim()}>
            {savingCorp && <Spinner animation="border" size="sm" />} {t("reservations.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminReservationDetailsPage;
