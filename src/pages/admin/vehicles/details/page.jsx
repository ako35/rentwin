import { useEffect, useState } from "react";
import { Alert, Button, ButtonGroup, Form, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { Loading, VehicleForm } from "../../../../components";
import { services } from "../../../../services";
import SellVehicleModal from "./sell-vehicle-modal";
import "./style.scss";

const { routes } = constants;

const trDate = (value) => (value ? new Date(value).toLocaleDateString("tr-TR") : "");

const toDateInput = (value) => (value ? utils.functions.getDate(value) : "");
const toText = (value) => value ?? "";

const AdminVehicleDetailsPage = () => {
  const { t } = useTranslation("admin");

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [sellModal, setSellModal] = useState(false);
  const [soldSaving, setSoldSaving] = useState(false);

  const { vehicleId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState({
    ...utils.initialValues.adminNewVehicleFormInitialValues,
  });

  const onSubmit = async (values) => {
    setUpdating(true);
    try {
      await services.vehicle.updateVehicle(vehicleId, values);
      utils.functions.swalToast(t("vehicles.toasts.updateSuccess"), "success");
    } catch (error) {
      const key =
        error?.response?.data?.code === "LICENSE_PLATE_TAKEN"
          ? "vehicles.toasts.plateTaken"
          : "vehicles.toasts.updateError";
      utils.functions.swalToast(t(key), "error");
    } finally {
      setUpdating(false);
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema: utils.validations.adminVehicleFormValidationSchema,
    onSubmit,
    enableReinitialize: true,
  });

  const loadData = async () => {
    try {
      const response = await services.vehicle.getVehicleByIdAdmin(vehicleId);
      setVehicle(response);
      setInitialValues({
        ...utils.initialValues.adminNewVehicleFormInitialValues,
        ...response,
        branchId: toText(response.branchId),
        chassisNo: toText(response.chassisNo),
        engineNo: toText(response.engineNo),
        color: toText(response.color),
        notes: toText(response.notes),
        registrationSerialNo: toText(response.registrationSerialNo),
        modelYear: response.modelYear ?? "",
        currentKm: response.currentKm ?? "",
        currentFuelEighths: response.currentFuelEighths != null ? String(response.currentFuelEighths) : "",
        registrationDate: toDateInput(response.registrationDate),
        nextMaintenanceDate: toDateInput(response.nextMaintenanceDate),
        nextInspectionDate: toDateInput(response.nextInspectionDate),
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    utils.functions
      .swalQuestion(
        t("vehicles.toasts.deleteConfirmTitle"),
        vehicle?.soldAt
          ? t("vehicles.toasts.deleteSoldConfirmText")
          : t("vehicles.toasts.deleteConfirmText"),
        { danger: true }
      )
      .then((result) => {
        if (result.isConfirmed) removeVehicle();
      });
  };

  const removeVehicle = async () => {
    setDeleting(true);
    try {
      await services.vehicle.deleteVehicle(vehicleId);
      await utils.functions.swalToast(t("vehicles.toasts.deleteSuccess"), "success");
      navigate(`${routes.adminVehicles}`);
    } catch (error) {
      const key =
        error?.response?.data?.code === "VEHICLE_HAS_HISTORY"
          ? "vehicles.toasts.deleteHasHistory"
          : "vehicles.toasts.deleteError";
      utils.functions.swalToast(t(key), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkSold = async ({ soldAt, saleNote }) => {
    setSoldSaving(true);
    try {
      const updated = await services.vehicle.markVehicleSold(vehicleId, { soldAt, saleNote });
      setVehicle(updated);
      setSellModal(false);
      utils.functions.swalToast(t("vehicles.toasts.soldSuccess"), "success");
    } catch (error) {
      const key =
        error?.response?.data?.code === "VEHICLE_HAS_ACTIVE_RENTALS"
          ? "vehicles.toasts.hasActiveRentals"
          : "vehicles.toasts.soldError";
      utils.functions.swalToast(t(key), "error");
    } finally {
      setSoldSaving(false);
    }
  };

  const handleUnsold = () => {
    utils.functions
      .swalQuestion(t("vehicles.sold.unmarkConfirmTitle"), t("vehicles.sold.unmarkConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setSoldSaving(true);
        try {
          const updated = await services.vehicle.unmarkVehicleSold(vehicleId);
          setVehicle(updated);
          utils.functions.swalToast(t("vehicles.toasts.unsoldSuccess"), "success");
        } catch (error) {
          utils.functions.swalToast(t("vehicles.toasts.soldError"), "error");
        } finally {
          setSoldSaving(false);
        }
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading height={500} />;

  const sold = !!vehicle?.soldAt;

  return (
    <>
      {sold && (
        <Alert variant="secondary" className="admin-vehicle-sold-alert">
          <div>
            <strong>{t("vehicles.sold.badge")}</strong> ·{" "}
            {t("vehicles.sold.soldOn", { date: trDate(vehicle.soldAt) })}
            {vehicle.saleNote && <div className="admin-vehicle-sold-alert__note">{vehicle.saleNote}</div>}
          </div>
          <Button variant="outline-secondary" size="sm" disabled={soldSaving} onClick={handleUnsold}>
            {soldSaving && <Spinner animation="border" size="sm" />} {t("vehicles.sold.unmarkButton")}
          </Button>
        </Alert>
      )}

      <Form noValidate onSubmit={formik.handleSubmit}>
        <VehicleForm
          mode="edit"
          formik={formik}
          vehicleId={vehicleId}
          vehicle={vehicle}
          disabled={formik.values.builtIn || sold}
          builtInWarning={formik.values.builtIn}
        >
          <ButtonGroup>
            <Button variant="outline-primary" onClick={() => navigate(`${routes.adminVehicles}`)}>
              {t("vehicles.cancel")}
            </Button>
            {!formik.values.builtIn && !sold && (
              <>
                <Button type="submit" disabled={!(formik.dirty && formik.isValid) || updating}>
                  {updating && <Spinner animation="border" size="sm" />} {t("vehicles.update")}
                </Button>
                <Button variant="outline-danger" disabled={soldSaving} onClick={() => setSellModal(true)}>
                  {t("vehicles.sold.markButton")}
                </Button>
              </>
            )}
            {!formik.values.builtIn && (
              <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                {deleting && <Spinner animation="border" size="sm" />} {t("vehicles.delete")}
              </Button>
            )}
          </ButtonGroup>
        </VehicleForm>
      </Form>

      <SellVehicleModal
        show={sellModal}
        onHide={() => setSellModal(false)}
        onConfirm={handleMarkSold}
        saving={soldSaving}
      />
    </>
  );
};

export default AdminVehicleDetailsPage;
