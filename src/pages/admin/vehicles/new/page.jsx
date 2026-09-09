import { useState } from "react";
import { Button, ButtonGroup, Form, Spinner } from "react-bootstrap";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { constants } from "../../../../constants";
import { utils } from "../../../../utils";
import { VehicleForm } from "../../../../components";
import { services } from "../../../../services";
import "./style.scss";

const { routes } = constants;

const AdminNewVehiclePage = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("admin");
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await services.vehicle.addVehicle(values);
      await utils.functions.swalToast(t("vehicles.toasts.createSuccess"), "success");
      navigate(`${routes.adminVehicles}`);
    } catch (error) {
      const key =
        error?.response?.data?.code === "LICENSE_PLATE_TAKEN"
          ? "vehicles.toasts.plateTaken"
          : "vehicles.toasts.createError";
      utils.functions.swalToast(t(key), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.adminNewVehicleFormInitialValues,
    validationSchema: utils.validations.adminVehicleFormValidationSchema,
    onSubmit,
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <VehicleForm mode="create" formik={formik}>
        <ButtonGroup>
          <Button
            variant="outline-primary"
            onClick={() => navigate(`${routes.adminVehicles}`)}
          >
            {t("vehicles.cancel")}
          </Button>
          <Button type="submit" disabled={!formik.isValid || loading}>
            {loading && <Spinner animation="border" size="sm" />} {t("vehicles.create")}
          </Button>
        </ButtonGroup>
      </VehicleForm>
    </Form>
  );
};

export default AdminNewVehiclePage;
