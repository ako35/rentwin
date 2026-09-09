import { useEffect, useState } from "react";
import { Button, ButtonGroup, Form, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { Loading, VehicleForm } from "../../../../components";
import { services } from "../../../../services";
import "./style.scss";

const { routes } = constants;

const toDateInput = (value) => (value ? utils.functions.getDate(value) : "");
const toText = (value) => value ?? "";

const AdminVehicleDetailsPage = () => {
  const { t } = useTranslation("admin");

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vehicle, setVehicle] = useState(null);

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
      const response = await services.vehicle.getVehicleById(vehicleId);
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
        t("vehicles.toasts.deleteConfirmText"),
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
      utils.functions.swalToast(t("vehicles.toasts.deleteError"), "error");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading height={500} />;

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <VehicleForm
        mode="edit"
        formik={formik}
        vehicleId={vehicleId}
        vehicle={vehicle}
        disabled={formik.values.builtIn}
        builtInWarning={formik.values.builtIn}
      >
        <ButtonGroup>
          <Button variant="outline-primary" onClick={() => navigate(`${routes.adminVehicles}`)}>
            {t("vehicles.cancel")}
          </Button>
          {!formik.values.builtIn && (
            <>
              <Button type="submit" disabled={!(formik.dirty && formik.isValid) || updating}>
                {updating && <Spinner animation="border" size="sm" />} {t("vehicles.update")}
              </Button>
              <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                {deleting && <Spinner animation="border" size="sm" />} {t("vehicles.delete")}
              </Button>
            </>
          )}
        </ButtonGroup>
      </VehicleForm>
    </Form>
  );
};

export default AdminVehicleDetailsPage;
