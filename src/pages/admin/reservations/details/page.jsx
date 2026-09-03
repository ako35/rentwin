import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  dropOffDate: "", dropOffTime: "", carId: "", status: "", userId: "",
  customerNote: "", adminNote: "", referenceNo: "", flightNo: "",
  dailyPrice: "", extrasTotal: "", oneWayFee: "", returnExtraAmount: "",
  discount: "", discountIsPercent: false, discountDailyOnly: true,
  deposit: "", kmLimit: "", unlimitedKm: true, vatRate: 20,
};
const EMPTY_NEW_CUST = {
  customerType: "Bireysel", companyTitle: "", taxOffice: "",
  firstName: "", lastName: "", nationalId: "",
  email: "", phoneNumber: "", address: "",
};

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
  const [custEdit, setCustEdit] = useState({});
  const [savingCust, setSavingCust] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [newCustModal, setNewCustModal] = useState(false);
  const [newCust, setNewCust] = useState(EMPTY_NEW_CUST);
  const [savingNewCust, setSavingNewCust] = useState(false);
  const [availableCars, setAvailableCars] = useState([]);
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
      customerNote: values.customerNote, adminNote: values.adminNote,
      referenceNo: values.referenceNo, flightNo: values.flightNo,
      dailyPrice: values.dailyPrice, extrasTotal: values.extrasTotal,
      oneWayFee: values.oneWayFee, returnExtraAmount: values.returnExtraAmount,
      discount: values.discount, discountIsPercent: values.discountIsPercent,
      discountDailyOnly: values.discountDailyOnly,
      deposit: values.deposit, kmLimit: values.unlimitedKm ? "" : values.kmLimit,
      unlimitedKm: values.unlimitedKm, vatRate: values.vatRate,
    };

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
      setInitialValues({
        ...EMPTY, ...r,
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

  const custLabel = (u) => (u.companyTitle || `${u.firstName} ${u.lastName}`).trim();

  // Load the picked customer into an editable copy + keep the search box in sync.
  // The panel layout is always shown; fields are blank until a customer is picked.
  useEffect(() => {
    const sc = customers.find((cx) => cx.id === formik.values.userId);
    setCustEdit(sc ? { ...sc } : {});
    if (sc) setCustQuery((sc.companyTitle || `${sc.firstName} ${sc.lastName}`).trim());
  }, [formik.values.userId, customers]);

  // Opening "Yeni Kontrat" again re-uses this component (same route) — clear the
  // customer selection so a fresh contract always starts with an empty picker.
  useEffect(() => {
    if (!isCreate) return;
    setCustQuery("");
    setCustEdit({});
    setNewCust(EMPTY_NEW_CUST);
    formik.setFieldValue("userId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey, isCreate]);

  const setCE = (key) => (e) => setCustEdit((c0) => ({ ...c0, [key]: e.target.value }));

  const saveCustomer = async () => {
    if (!custEdit.id) return;
    setSavingCust(true);
    try {
      await services.user.updateUserAdmin(custEdit.id, {
        customerType: custEdit.customerType || "Bireysel",
        firstName: custEdit.firstName || "",
        lastName: custEdit.lastName || "",
        companyTitle: custEdit.companyTitle || "",
        taxOffice: custEdit.taxOffice || "",
        email: custEdit.email,
        phoneNumber: custEdit.phoneNumber || "",
        address: custEdit.address || "",
        zipCode: custEdit.zipCode || "",
        nationalId: custEdit.nationalId || "",
        customerCode: custEdit.customerCode || "",
        notes: custEdit.notes || "",
      });
      utils.functions.swalToast(t("users.toasts.updateSuccess"), "success");
      refreshCustomers();
    } catch {
      utils.functions.swalToast(t("reservations.contract.records.error"), "error");
    } finally {
      setSavingCust(false);
    }
  };

  const openNewCust = () => {
    const q = custQuery.trim();
    setNewCust({
      ...EMPTY_NEW_CUST,
      ...(q.includes("@") ? { email: q } : q ? { firstName: q } : {}),
    });
    setCustOpen(false);
    setNewCustModal(true);
  };

  const saveNewCust = async () => {
    setSavingNewCust(true);
    try {
      const created = await services.user.createUserAdmin(newCust);
      const list = await services.user.getUsersByPage(0, 300, "firstName", "ASC", { role: "Customer" });
      setCustomers(list?.content || []);
      formik.setFieldValue("userId", created.id);
      setNewCustModal(false);
      setNewCust(EMPTY_NEW_CUST);
      utils.functions.swalToast(t("newCustomer.success"), "success");
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409
          ? t("newCustomer.emailExists")
          : error?.response?.data?.message || t("newCustomer.error"),
        "error"
      );
    } finally {
      setSavingNewCust(false);
    }
  };

  const selectedCar = useMemo(
    () => [...vehicles, ...availableCars].find((v) => v.id === formik.values.carId),
    [vehicles, availableCars, formik.values.carId]
  );

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
  const carList = isCreate ? availableCars : vehicles;
  const vehicleOptions = [
    ...(isCreate ? [{ id: "__none", value: "", name: `— ${t("newContract.selectVehicle")} —` }] : []),
    ...carList.map((veh) => ({
      id: veh.id, value: veh.id,
      name: `${veh.brand} ${veh.model} — ${veh.licensePlate}${veh.branch ? ` · ${veh.branch.name}` : ""}`,
    })),
  ];
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
  const saveFirst = <p className="text-muted mb-0">{c("saveFirstHint")}</p>;
  const createCustomerPicker = (
    <>
      <div className="contract-page__corp-head">
        <Form.Label className="mb-0">* {c("customerName")}</Form.Label>
        <span>
          <button type="button" className="contract-page__link" onClick={refreshCustomers}>
            ↻ {c("refresh")}
          </button>
          {"  "}
          <button type="button" className="contract-page__link" onClick={openNewCust}>
            + {c("newCustomerBtn")}
          </button>
        </span>
      </div>
      {(() => {
        const q = custQuery.trim().toLowerCase();
        const matches = customers
          .filter((u) => {
            if (!q || u.id === formik.values.userId) return true;
            return [u.firstName, u.lastName, u.companyTitle, u.email, u.nationalId, u.phoneNumber]
              .some((f) => (f || "").toLowerCase().includes(q));
          })
          .slice(0, 25);
        return (
          <div className="contract-page__typeahead mb-2">
            <Form.Control
              size="sm"
              autoComplete="off"
              placeholder={c("customerSearch")}
              value={custQuery}
              onChange={(e) => {
                setCustQuery(e.target.value);
                setCustOpen(true);
                if (formik.values.userId) formik.setFieldValue("userId", "");
              }}
              onFocus={() => setCustOpen(true)}
              onBlur={() => setTimeout(() => setCustOpen(false), 150)}
            />
            {custOpen && (
              <ul className="contract-page__typeahead-list">
                {matches.map((u) => (
                  <li key={u.id} onMouseDown={() => {
                    formik.setFieldValue("userId", u.id);
                    setCustQuery(custLabel(u));
                    setCustOpen(false);
                  }}>
                    {custLabel(u)}
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="contract-page__typeahead-add" onMouseDown={openNewCust}>
                    + {c("customerNotFoundAdd")}
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      })()}
      {(() => {
        const hasCust = !!custEdit.id;
        const isCorp = (custEdit.customerType || "Bireysel") === "Kurumsal";
        const ci = (name, label, type = "text") => (
          <div className="contract-page__cust-row" key={name}>
            <label>{label}</label>
            <Form.Control size="sm" type={type} value={custEdit[name] || ""} onChange={setCE(name)} disabled={!hasCust} />
          </div>
        );
        return (
          <div className="contract-page__cust-edit">
            <div className="contract-page__cust-row">
              <label>{c("custType")}</label>
              <strong>{hasCust ? (isCorp ? c("corporate") : c("individual")) : "—"}</strong>
            </div>
            {isCorp ? (
              <>
                {ci("companyTitle", c("corporateTitle"))}
                {ci("taxOffice", c("taxOffice"))}
              </>
            ) : (
              <>
                {ci("firstName", t("users.form.firstName"))}
                {ci("lastName", t("users.form.lastName"))}
              </>
            )}
            {ci("nationalId", isCorp ? c("taxNo") : c("custNationalId"))}
            {ci("email", c("customerEmail"), "email")}
            {ci("phoneNumber", c("customerPhone"))}
            {ci("address", c("custAddress"))}
            {ci("notes", c("adminNote"))}
            <div className="contract-page__cust-row">
              <label>{c("custBalance")}</label>
              <strong>{hasCust ? `${money(custEdit.balance)} TL` : "—"}</strong>
            </div>
            {hasCust && (
              <div className="text-end mt-2">
                <Button type="button" size="sm" variant="outline-primary" disabled={savingCust} onClick={saveCustomer}>
                  {savingCust && <Spinner animation="border" size="sm" />} {c("updateCustomer")}
                </Button>
              </div>
            )}
          </div>
        );
      })()}
    </>
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
      <div className={`contract-page__ribbon${isCreate ? " contract-page__ribbon--create" : ""}`}>
        <div className="contract-page__ribbon-main">
          <span className="contract-page__ribbon-id">
            {isCreate ? c("newTitle") : `${c("title")} # ${reservationId.slice(0, 10).toUpperCase()}`}
          </span>
          {!isCreate && formik.values.referenceNo && (
            <span className="contract-page__ribbon-ref">
              ({c("contractNo")}: # {formik.values.referenceNo})
            </span>
          )}
        </div>
        <div className="contract-page__ribbon-title">{isCreate ? "" : c("detailTitle")}</div>
        <div className="contract-page__ribbon-meta">
          {!isCreate && meta.updatedAt && (
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
              <CustomForm formik={formik} name="carId" label={c("vehicle")} type="select" itemsArr={vehicleOptions} />
              {isCreate && !availableCars.length && (
                <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{c("noAvailableCars")}</p>
              )}
              {selectedCar?.branch && ro(c("branch"), selectedCar.branch.name)}
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
              {isCreate ? saveFirst : (
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
              )}
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
                  {isCreate ? createCustomerPicker : (
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
                      return cu ? (cu.companyTitle || `${cu.firstName} ${cu.lastName}`).trim() : "";
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

                {!isCreate && (
                  <div className="contract-page__price-actions">
                    <Button type="submit" variant="outline-primary" size="sm" disabled={updating}>{c("recalc")}</Button>
                  </div>
                )}
              </div>

              <div className="contract-page__balance">
                <strong>{money(collected - pricing.total)} TL</strong>
                <span>{c("balance").toUpperCase()}</span>
              </div>
            </section>
          </div>
        </div>

        <div className="contract-page__actions">
          {isCreate ? (
            <>
              <Button variant="outline-secondary" type="button" disabled={updating}
                onClick={() => navigate(routes.adminReservations)}>
                {c("discard")}
              </Button>
              <span className="contract-page__actions-spacer" />
              <Button type="submit" disabled={!formik.isValid || updating}>
                {updating && <Spinner animation="border" size="sm" />} {c("createSave")}
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </Form>

      {(() => {
        const isCorp = newCust.customerType === "Kurumsal";
        const setNC = (k) => (e) => setNewCust((f) => ({ ...f, [k]: e.target.value }));
        const canSave =
          newCust.email.trim() &&
          (isCorp ? newCust.companyTitle.trim() : newCust.firstName.trim() && newCust.lastName.trim());
        const nf = (name, label, type = "text") => (
          <Form.Group className="mb-2" key={name}>
            <Form.Label>{label}</Form.Label>
            <Form.Control type={type} value={newCust[name]} onChange={setNC(name)} />
          </Form.Group>
        );
        return (
          <Modal show={newCustModal} size="lg" onHide={() => setNewCustModal(false)}>
            <Modal.Header closeButton><Modal.Title>{t("newCustomer.title")}</Modal.Title></Modal.Header>
            <Modal.Body>
              <div className="contract-page__radios mb-3">
                <Form.Check inline type="radio" id="ncm-ind" label={c("individual")}
                  checked={!isCorp} onChange={() => setNewCust((f) => ({ ...f, customerType: "Bireysel" }))} />
                <Form.Check inline type="radio" id="ncm-corp" label={c("corporate")}
                  checked={isCorp} onChange={() => setNewCust((f) => ({ ...f, customerType: "Kurumsal" }))} />
              </div>
              <div className="contract-page__newcust-grid">
                {isCorp
                  ? [nf("companyTitle", `* ${c("corporateTitle")}`), nf("taxOffice", c("taxOffice")), nf("nationalId", c("taxNo"))]
                  : [nf("firstName", `* ${t("users.form.firstName")}`), nf("lastName", `* ${t("users.form.lastName")}`), nf("nationalId", c("custNationalId"))]}
                {nf("email", `* ${c("customerEmail")}`, "email")}
                {nf("phoneNumber", c("customerPhone"))}
                {nf("address", c("custAddress"))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setNewCustModal(false)}>{t("reservations.cancel")}</Button>
              <Button onClick={saveNewCust} disabled={savingNewCust || !canSave}>
                {savingNewCust && <Spinner animation="border" size="sm" />} {t("newCustomer.create")}
              </Button>
            </Modal.Footer>
          </Modal>
        );
      })()}
    </div>
  );
};

export default AdminReservationDetailsPage;
