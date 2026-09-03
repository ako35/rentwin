import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Form, Nav } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { CustomForm, Loading } from "../../../../components";
import { useContractData } from "./use-contract-data";
import ContractRibbon from "./parts/ContractRibbon";
import VehicleSection from "./parts/VehicleSection";
import ExtrasSection from "./parts/ExtrasSection";
import CustomerPanel from "./parts/CustomerPanel";
import CustomerSummary from "./parts/CustomerSummary";
import DriversTab from "./parts/DriversTab";
import InvoiceTab from "./parts/InvoiceTab";
import SummaryTab from "./parts/SummaryTab";
import PaymentsTab from "./parts/PaymentsTab";
import ExtensionTab from "./parts/ExtensionTab";
import PricingBlock from "./parts/PricingBlock";
import ContractActions from "./parts/ContractActions";
import NewCustomerModal from "./parts/NewCustomerModal";
import {
  fetchCustomers,
  formatMoney,
  custLabel,
  computeBillableDays,
  computePricing,
  buildContractDto,
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

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [topTab, setTopTab] = useState("customer");
  const [subTab, setSubTab] = useState("summary");
  const [newCustModal, setNewCustModal] = useState(false);

  const {
    loading,
    vehicles, branches, customers, customer, meta,
    initialValues, availableCars, payments, catalog, extensions, invoice,
    setCustomers, setAvailableCars, setInvoice,
    loadData, loadPayments, refreshCustomers,
  } = useContractData({ isCreate, reservationId });

  const money = (v) => formatMoney(v, i18n.language);

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

  const openNewCust = () => setNewCustModal(true);

  const handleNewCustomerCreated = async (created) => {
    setCustomers(await fetchCustomers().catch(() => []));
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
                    <CustomerSummary customer={customer} userId={formik.values.userId} />
                  )}
                </div>
              )}

              {topTab === "drivers" && (
                <div className="contract-page__top-content">
                  <DriversTab isCreate={isCreate} reservationId={reservationId} recordLabels={recordLabels} />
                </div>
              )}

              {topTab === "invoice" && (
                <div className="contract-page__top-content">
                  <InvoiceTab
                    isCreate={isCreate}
                    reservationId={reservationId}
                    invoice={invoice}
                    onInvoiceCreated={setInvoice}
                    money={money}
                  />
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
                  <SummaryTab
                    formik={formik}
                    selectedCar={selectedCar}
                    billableDays={billableDays}
                    customerName={(() => {
                      const cu = customer || customers.find((cx) => cx.id === formik.values.userId);
                      return cu ? custLabel(cu) : "";
                    })()}
                    statusOptions={statusOptions}
                    money={money}
                  />
                )}

                {subTab === "payments" && (
                  <PaymentsTab
                    isCreate={isCreate}
                    reservationId={reservationId}
                    recordLabels={recordLabels}
                    total={pricing.total}
                    collected={collected}
                    onPaymentsChange={loadPayments}
                    money={money}
                  />
                )}

                {subTab === "returnExtra" && (
                  <CustomForm formik={formik} name="returnExtraAmount" label={c("returnExtraAmount")} type="number" />
                )}

                {subTab === "extension" && (
                  <ExtensionTab
                    isCreate={isCreate}
                    reservationId={reservationId}
                    minDate={formik.values.dropOffDate}
                    extensions={extensions}
                    onExtended={loadData}
                    money={money}
                  />
                )}
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
