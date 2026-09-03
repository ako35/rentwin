import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Button, Form, Nav, Spinner } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { ContractRecords, CustomForm, Loading } from "../../../../components";
import ContractRibbon from "./parts/ContractRibbon";
import VehicleSection from "./parts/VehicleSection";
import ExtrasSection from "./parts/ExtrasSection";
import CustomerPanel from "./parts/CustomerPanel";
import PricingBlock from "./parts/PricingBlock";
import ContractActions from "./parts/ContractActions";
import NewCustomerModal from "./parts/NewCustomerModal";
import RoRow from "./parts/RoRow";
import {
  EMPTY_CONTRACT as EMPTY,
  formatMoney,
  custLabel,
  computeBillableDays,
  computePricing,
  buildContractDto,
  reservationToFormValues,
  buildVehicleOptions,
  buildStatusOptions,
  buildRecordLabels,
} from "./contract-helpers";
import "./style.scss";

const { routes } = constants;

const AdminReservationDetailsPage = () => {
  const { reservationId } = useParams();
  const isCreate = !reservationId;
  const navigate = useNavigate();
  const { key: navKey } = useLocation();
  const { t } = useTranslation("admin");
  const { t: tCommon, i18n } = useTranslation("common");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [meta, setMeta] = useState({});
  const [initialValues, setInitialValues] = useState(EMPTY);
  const [topTab, setTopTab] = useState("customer");
  const [subTab, setSubTab] = useState("summary");
  const [newCustModal, setNewCustModal] = useState(false);
  const [availableCars, setAvailableCars] = useState([]);
  const [payments, setPayments] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [extForm, setExtForm] = useState({ date: "", time: "", extraAmount: "", note: "" });
  const [extending, setExtending] = useState(false);
  const [invoicing, setInvoicing] = useState(false);

  const money = (v) => formatMoney(v, i18n.language);

  const loadPayments = () =>
    services.reservation.getRecords(reservationId, "payments")
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]));

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = buildContractDto(values);

    if (isCreate) {
      try {
        const { id } = await services.reservation.createReservationAdmin({
          carId: values.carId,
          userId: values.userId,
          pickUpLocation: values.pickUpLocation,
          dropOffLocation: values.dropOffLocation || values.pickUpLocation,
          pickUpTime: dto.pickUpTime,
          dropOffTime: dto.dropOffTime,
        });
        let patched = true;
        try {
          await services.reservation.updateReservation(values.carId, id, dto);
        } catch {
          patched = false;
        }
        utils.functions.swalToast(
          patched ? t("reservations.contract.createdSuccess") : t("reservations.toasts.updateError"),
          patched ? "success" : "warning"
        );
        navigate(`${routes.adminReservations}/${id}`);
      } catch {
        utils.functions.swalToast(t("newContract.error"), "error");
        setUpdating(false);
      }
      return;
    }

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

  const loadRefData = async () => {
    const [v, b, cat] = await Promise.all([
      services.vehicle.getVehicles(),
      services.branch.getBranches().catch(() => []),
      services.extra.getExtras().catch(() => []),
    ]);
    setVehicles(v || []);
    setBranches(b || []);
    setCatalog(cat || []);
  };

  const loadCreate = async () => {
    try {
      await loadRefData();
      const u = await services.user
        .getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" })
        .catch(() => ({ content: [] }));
      setCustomers(u?.content || []);
      setInitialValues({
        ...EMPTY,
        status: "CREATED",
        pickUpDate: moment().format("YYYY-MM-DD"),
        pickUpTime: "10:00",
        dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
        dropOffTime: "10:00",
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (isCreate) return loadCreate();
    try {
      await loadRefData();
      const r = await services.reservation.getReservationByIdAdmin(reservationId);
      setExtensions(r.extensions || []);
      setInvoice(r.invoice || null);
      loadPayments();
      setCustomer(r.customer || null);
      setMeta({ createdAt: r.createdAt, updatedAt: r.updatedAt });
      setInitialValues(reservationToFormValues(r));
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

  // Create mode: keep the vehicle picker limited to cars actually free for the
  // chosen date range (and not out of service). Refetch whenever the range changes.
  const { pickUpDate, pickUpTime, dropOffDate, dropOffTime } = formik.values;
  useEffect(() => {
    if (!isCreate || !pickUpDate || !dropOffDate) return;
    if (!moment(`${dropOffDate} ${dropOffTime || "00:00"}`).isAfter(`${pickUpDate} ${pickUpTime || "00:00"}`)) return;
    let cancelled = false;
    services.reservation
      .getAvailableCarsAdmin({
        pickUpTime: utils.functions.combineDateAndTime(pickUpDate, pickUpTime || "00:00"),
        dropOffTime: utils.functions.combineDateAndTime(dropOffDate, dropOffTime || "00:00"),
      })
      .then((list) => {
        if (cancelled) return;
        const cars = Array.isArray(list) ? list : [];
        setAvailableCars(cars);
        if (formik.values.carId && !cars.some((c) => c.id === formik.values.carId)) {
          formik.setFieldValue("carId", "");
        }
      })
      .catch(() => !cancelled && setAvailableCars([]));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreate, pickUpDate, pickUpTime, dropOffDate, dropOffTime]);

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


  const refreshCustomers = () =>
    services.user
      .getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" })
      .then((list) => setCustomers(list?.content || []))
      .catch(() => {});

  // A customer added in the "Yeni Müşteri" tab shows up when the user returns here.
  useEffect(() => {
    if (!isCreate) return undefined;
    const onFocus = () => {
      services.user
        .getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" })
        .then((list) => setCustomers(list?.content || []))
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isCreate]);

  const openNewCust = () => setNewCustModal(true);

  const handleNewCustomerCreated = async (created) => {
    const list = await services.user.getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" });
    setCustomers(list?.content || []);
    formik.setFieldValue("userId", created.id);
    setNewCustModal(false);
  };

  const selectedCar = useMemo(
    () => [...vehicles, ...availableCars].find((v) => v.id === formik.values.carId),
    [vehicles, availableCars, formik.values.carId]
  );

  const billableDays = useMemo(() => computeBillableDays(formik.values), [formik.values]);

  const extensionTotal = extensions.reduce((s, e) => s + (Number(e.extraAmount) || 0), 0);
  const extensionDays = extensions.reduce((s, e) => s + (Number(e.extraDays) || 0), 0);
  const collected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const pricing = useMemo(
    () => computePricing(formik.values, billableDays),
    [formik.values, billableDays]
  );

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
  const carList = isCreate ? availableCars : vehicles;
  const vehicleOptions = buildVehicleOptions(carList, {
    isCreate,
    placeholder: t("newContract.selectVehicle"),
  });
  const statusOptions = buildStatusOptions(tCommon);
  const recordLabels = buildRecordLabels(t);

  if (loading) return <Loading />;

  const c = (key, opts) => t(`reservations.contract.${key}`, opts);
  const ro = (label, value) => <RoRow label={label} value={value} />;
  const saveFirst = <p className="text-muted mb-0">{c("saveFirstHint")}</p>;

  return (
    <div className="contract-page">
      <ContractRibbon
        isCreate={isCreate}
        reservationId={reservationId}
        referenceNo={formik.values.referenceNo}
        updatedAt={meta.updatedAt}
      />

      <Form noValidate onSubmit={formik.handleSubmit}>
        <div className="contract-page__grid">
          {/* ---------- LEFT ---------- */}
          <div className="contract-page__col">
            <VehicleSection
              formik={formik}
              branchNames={branchNames}
              vehicleOptions={vehicleOptions}
              selectedCar={selectedCar}
              isCreate={isCreate}
              showNoAvailable={!availableCars.length}
            />
            <ExtrasSection
              isCreate={isCreate}
              reservationId={reservationId}
              catalog={catalog}
              recordLabels={recordLabels}
              extrasTotal={formik.values.extrasTotal}
              onChange={loadData}
              money={money}
            />
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
                  {isCreate ? (
                    <CustomerPanel
                      formik={formik}
                      customers={customers}
                      refreshCustomers={refreshCustomers}
                      onRequestNewCustomer={openNewCust}
                      resetKey={navKey}
                      money={money}
                    />
                  ) : (
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
                  )}
                </div>
              )}

              {topTab === "drivers" && (
                <div className="contract-page__top-content">
                  {isCreate ? saveFirst : (
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
                  )}
                </div>
              )}

              {topTab === "invoice" && (
                <div className="contract-page__top-content">
                  {isCreate ? saveFirst : invoice ? (
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
                {["summary", "payments", "returnExtra", "extension"].map((k) => (
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
                    {ro(c("customerName"), (() => {
                      const cu = customer || customers.find((cx) => cx.id === formik.values.userId);
                      return cu ? custLabel(cu) : "";
                    })())}
                    <CustomForm formik={formik} name="customerNote" label={c("customerNote")} type="textarea" rows={2} />
                    <CustomForm formik={formik} name="adminNote" label={c("adminNote")} type="textarea" rows={2} />
                    <CustomForm formik={formik} name="status" label={c("status")} type="select" itemsArr={statusOptions} />
                  </>
                )}

                {subTab === "payments" && (isCreate ? saveFirst : (
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
                ))}

                {subTab === "returnExtra" && (
                  <CustomForm formik={formik} name="returnExtraAmount" label={c("returnExtraAmount")} type="number" />
                )}

                {subTab === "extension" && (isCreate ? saveFirst : (
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
                ))}
              </div>

              <PricingBlock
                formik={formik}
                pricing={pricing}
                billableDays={billableDays}
                extensionDays={extensionDays}
                extensionTotal={extensionTotal}
                isCreate={isCreate}
                updating={updating}
                money={money}
              />

              <div className="contract-page__balance">
                <strong>{money(collected - pricing.total)} TL</strong>
                <span>{c("balance").toUpperCase()}</span>
              </div>
            </section>
          </div>
        </div>

        <ContractActions
          isCreate={isCreate}
          updating={updating}
          deleting={deleting}
          canSave={isCreate ? formik.isValid : formik.isValid && formik.dirty}
          onDiscard={() => navigate(routes.adminReservations)}
          onDelete={handleDelete}
        />
      </Form>

      <NewCustomerModal
        show={newCustModal}
        onHide={() => setNewCustModal(false)}
        onCreated={handleNewCustomerCreated}
      />
    </div>
  );
};

export default AdminReservationDetailsPage;
