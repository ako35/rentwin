import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { Form } from "react-bootstrap";
import moment from "moment/moment";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { Loading } from "../../../../components";
import { useContractData } from "./use-contract-data";
import ContractRibbon from "./parts/ContractRibbon";
import VehicleSection from "./parts/VehicleSection";
import ExtrasSection from "./parts/ExtrasSection";
import ContractRightCard from "./parts/ContractRightCard";
import ContractActions from "./parts/ContractActions";
import NewCustomerModal from "./parts/NewCustomerModal";
import {
  fetchCustomers,
  formatMoney,
  computeBillableDays,
  computePricing,
  buildContractDto,
  buildVehicleOptions,
  buildRecordLabels,
} from "./contract-helpers";
import "./style.scss";

const { routes } = constants;

const ContractDetail = () => {
  const { contractId } = useParams();
  const isCreate = !contractId;
  const navigate = useNavigate();
  const { key: navKey } = useLocation();
  const { t } = useTranslation("admin");
  const { i18n } = useTranslation("common");

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newCustModal, setNewCustModal] = useState(false);

  const {
    loading,
    vehicles, branches, customers, customer, meta,
    initialValues, availableCars, payments, catalog, extensions, vehicleChanges, invoice,
    setCustomers, setAvailableCars, setInvoice,
    loadData, loadPayments, refreshCustomers,
  } = useContractData({ isCreate, contractId });

  const money = (v) => formatMoney(v, i18n.language);

  const onSubmit = async (values) => {
    setUpdating(true);
    const dto = buildContractDto(values);

    if (isCreate) {
      try {
        const { id } = await services.contract.createContract({
          carId: values.carId,
          userId: values.userId,
          pickUpLocation: values.pickUpLocation,
          dropOffLocation: values.dropOffLocation || values.pickUpLocation,
          pickUpTime: dto.pickUpTime,
          dropOffTime: dto.dropOffTime,
        });
        let patched = true;
        try {
          await services.contract.updateContract(values.carId, id, dto);
        } catch {
          patched = false;
        }
        utils.functions.swalToast(
          patched ? t("reservations.contract.createdSuccess") : t("reservations.toasts.updateError"),
          patched ? "success" : "warning"
        );
        navigate(`${routes.adminContracts}/${id}`);
      } catch {
        utils.functions.swalToast(t("newContract.error"), "error");
        setUpdating(false);
      }
      return;
    }

    try {
      await services.contract.updateContract(values.carId, contractId, dto);
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
    services.contract
      .getAvailableCars({
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
          await services.contract.deleteContract(contractId);
          await utils.functions.swalToast(t("reservations.toasts.deleteSuccess"), "success");
          navigate(routes.adminContracts);
        } catch {
          utils.functions.swalToast(t("reservations.toasts.deleteError"), "error");
        } finally {
          setDeleting(false);
        }
      });
  };

  // Contract lifecycle: "Araç Teslim Al" -> DONE, "Kontratı İptal Et" ->
  // CANCELLED, "Geri Aç" -> CREATED. Each confirms, calls its endpoint, reloads.
  const runStatusAction = (apiCall, titleKey, textKey, successKey) => () => {
    utils.functions
      .swalQuestion(t(`reservations.contract.${titleKey}`), t(`reservations.contract.${textKey}`))
      .then(async (res) => {
        if (!res.isConfirmed) return;
        setUpdating(true);
        try {
          await apiCall(contractId);
          utils.functions.swalToast(t(`reservations.contract.${successKey}`), "success");
          loadData();
        } catch {
          utils.functions.swalToast(t("reservations.toasts.updateError"), "error");
        } finally {
          setUpdating(false);
        }
      });
  };

  const handleVehicleReturn = runStatusAction(
    services.contract.returnContract, "returnConfirmTitle", "returnConfirmText", "returnedSuccess"
  );
  const handleCancelContract = runStatusAction(
    services.contract.cancelContract, "cancelConfirmTitle", "cancelConfirmText", "cancelledSuccess"
  );
  const handleReopen = runStatusAction(
    services.contract.reopenContract, "reopenConfirmTitle", "reopenConfirmText", "reopenedSuccess"
  );

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

  // Switching to a *different* vehicle than the form loaded with pulls that car's
  // current odometer + fuel into the hand-over fields (they start empty in create
  // mode, stay editable). An opened contract keeps the snapshot it was saved with.
  const fuelPrefillFor = useRef(undefined);
  useEffect(() => {
    const carId = formik.values.carId;
    const baseline = initialValues.carId || "";
    if (carId === baseline) {
      fuelPrefillFor.current = carId;
      return;
    }
    if (carId === fuelPrefillFor.current) return;
    fuelPrefillFor.current = carId;
    if (!carId) {
      formik.setFieldValue("pickUpKm", "");
      formik.setFieldValue("pickUpFuelEighths", "");
      return;
    }
    if (!selectedCar) {
      fuelPrefillFor.current = undefined; // car object not loaded yet — retry when it is
      return;
    }
    formik.setFieldValue("pickUpKm", selectedCar.currentKm ?? "");
    formik.setFieldValue(
      "pickUpFuelEighths",
      selectedCar.currentFuelEighths != null ? String(selectedCar.currentFuelEighths) : ""
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.carId, selectedCar, initialValues.carId]);

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
  const recordLabels = buildRecordLabels(t);

  // A closed contract (returned or cancelled) is read-only until reopened.
  const contractStatus = formik.values.status;
  const locked = !isCreate && (contractStatus === "DONE" || contractStatus === "CANCELLED");

  if (loading) return <Loading />;

  return (
    <div className="contract-page">
      <ContractRibbon
        isCreate={isCreate}
        contractId={contractId}
        contractNo={formik.values.contractNo}
        status={contractStatus}
        updatedAt={meta.updatedAt}
      />

      <Form noValidate onSubmit={formik.handleSubmit}>
        <fieldset className="contract-page__fieldset" disabled={locked}>
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
              contractId={contractId}
              catalog={catalog}
              recordLabels={recordLabels}
              extrasTotal={formik.values.extrasTotal}
              onChange={loadData}
              money={money}
            />
          </div>

          {/* ---------- RIGHT ---------- */}
          <div className="contract-page__col">
            <ContractRightCard
              isCreate={isCreate}
              contractId={contractId}
              formik={formik}
              navKey={navKey}
              customers={customers}
              customer={customer}
              invoice={invoice}
              extensions={extensions}
              vehicleChanges={vehicleChanges}
              refreshCustomers={refreshCustomers}
              onRequestNewCustomer={openNewCust}
              onInvoiceCreated={setInvoice}
              loadData={loadData}
              loadPayments={loadPayments}
              selectedCar={selectedCar}
              billableDays={billableDays}
              pricing={pricing}
              collected={collected}
              extensionDays={extensionDays}
              extensionTotal={extensionTotal}
              recordLabels={recordLabels}
              updating={updating}
              money={money}
            />
          </div>
        </div>
        </fieldset>

        <ContractActions
          isCreate={isCreate}
          updating={updating}
          deleting={deleting}
          canSave={isCreate ? formik.isValid : formik.isValid && formik.dirty}
          status={contractStatus}
          onDiscard={() => navigate(routes.adminContracts)}
          onDelete={handleDelete}
          onVehicleReturn={handleVehicleReturn}
          onCancelContract={handleCancelContract}
          onReopen={handleReopen}
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

// Re-key on the route param so "create" -> "/:id" (after "Oluştur ve Aç") and
// any "/:id" -> "/:other" fully remounts the screen: state (updating, formik)
// resets and the freshly saved contract is loaded from the server.
const AdminContractDetailsPage = () => {
  const { contractId } = useParams();
  return <ContractDetail key={contractId || "new"} />;
};

export default AdminContractDetailsPage;
