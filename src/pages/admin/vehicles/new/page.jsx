import { useRef, useState } from "react";
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
  const [imageSrc, setImageSrc] = useState("");
  const { t } = useTranslation("admin");
  const fileImageRef = useRef();
  const navigate = useNavigate();

  const onSubmit = async (values) => {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", values.image);

    try {
      const imageData = await services.vehicle.uploadVehicleImage(formData);
      const payload = { ...values };
      delete payload.image;
      await services.vehicle.addVehicle(imageData.imageId, payload);
      await utils.functions.swalToast(t("vehicles.toasts.createSuccess"), "success");
      navigate(`${routes.adminVehicles}`);
    } catch (error) {
      utils.functions.swalToast(t("vehicles.toasts.createError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.adminNewVehicleFormInitialValues,
    validationSchema: utils.validations.adminVehicleFormValidationSchema,
    onSubmit,
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImageSrc(reader.result);
      formik.setFieldValue("image", file);
    };
  };

  return (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <VehicleForm
        mode="create"
        formik={formik}
        imageSrc={imageSrc}
        imageError={formik.errors.image}
        fileImageRef={fileImageRef}
        onImageChange={handleImageChange}
      >
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
