import {
  Badge,
  Button,
  ButtonGroup,
  Col,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { constants } from "../../../../constants";
import { useState } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { useNavigate } from "react-router-dom";
import { CustomForm } from "../../../../components";
import "./style.scss";
import { services } from "../../../../services";

const { routes } = constants;

const AdminNewVehiclePage = () => {
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");

  const navigate = useNavigate();

  const formItems = [
    {
      name: "brand",
      label: t("vehicles.form.brand"),
      asGroup: Col,
    },
    {
      name: "model",
      label: t("vehicles.form.model"),
      asGroup: Col,
    },
    {
      name: "licensePlate",
      label: t("vehicles.form.licensePlate"),
      asGroup: Col,
    },
    {
      name: "doors",
      label: t("vehicles.form.doors"),
      asGroup: Col,
      type: "number",
    },
    {
      name: "seats",
      label: t("vehicles.form.seats"),
      asGroup: Col,
      type: "number",
    },
    {
      name: "luggage",
      label: t("vehicles.form.luggage"),
      asGroup: Col,
      type: "number",
    },
    {
      name: "age",
      label: t("vehicles.form.age"),
      asGroup: Col,
      type: "number",
    },
    {
      name: "pricePerHour",
      label: t("vehicles.form.pricePerHour"),
      asGroup: Col,
      type: "number",
    },
    {
      name: "transmission",
      label: t("vehicles.form.transmission"),
      asGroup: Col,
      type: "select",
      itemsArr: constants.transmissionTypes.map((item) => ({
        ...item,
        name: tCommon(`options.transmissionTypes.${item.value}`),
      })),
    },
    {
      name: "airConditioning",
      label: t("vehicles.form.airConditioner"),
      asGroup: Col,
      type: "select",
      itemsArr: constants.airConditioningTypes.map((item) => ({
        ...item,
        name: tCommon(`options.airConditioning.${item.value ? "yes" : "no"}`),
      })),
    },
    {
      name: "fuelType",
      label: t("vehicles.form.fuelType"),
      asGroup: Col,
      type: "select",
      itemsArr: constants.fuelTypes.map((item) => ({
        ...item,
        name: tCommon(`options.fuelTypes.${item.value}`),
      })),
    },
  ];

  const onSubmit = async (values) => {
    setLoading(true);

    const formData = new FormData();
    formData.append("file", values.image);

    try {
      const imageData = await services.vehicle.uploadVehicleImage(formData);
      delete values.image;
      await services.vehicle.addVehicle(imageData.imageId, values);
      await utils.functions.swalToast(t("vehicles.toasts.createSuccess"), "success");
      navigate(`${routes.adminVehicles}`);
    } catch (error) {
      utils.functions.swalToast(
        t("vehicles.toasts.createError"),
        "error"
      );
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
      <div className="admin-new-vehicle-form">
        <Row className="align-items-center">
          <Col xl={3} className="image-area">
            {imageSrc && (
              <img
                src={imageSrc}
                alt={formik?.values?.model}
                title={formik?.values?.model}
              />
            )}
            <Form.Group>
              <Form.Control
                type="file"
                name="image"
                accept=".jpg, .jpeg, .png"
                onChange={handleImageChange}
                id="selectImage"
                className="d-none"
              />
              <div className="cover">
                <Button
                  as={Form.Label}
                  htmlFor="selectImage"
                  // onClick={handleSelectImage}
                >
                  {t("vehicles.selectImage")}
                </Button>
              </div>
            </Form.Group>
            <Badge bg="danger" className="image-error">
              {formik.errors.image}
            </Badge>
          </Col>
          <Col xl={9}>
            <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3">
              {formItems.map((item) => (
                <CustomForm key={item.name} formik={formik} {...item} />
              ))}
            </Row>
            <Form.Check
              type="switch"
              id="outOfService"
              name="outOfService"
              label={t("vehicles.outOfService")}
              checked={formik.values.outOfService}
              onChange={formik.handleChange}
              className="mt-3"
            />
          </Col>
        </Row>
        <div className="text-end">
          <ButtonGroup>
            <Button onClick={() => navigate(`${routes.adminVehicles}`)}>
              {t("vehicles.cancel")}
            </Button>
            <Button type="submit" disabled={!formik.isValid || loading}>
              {loading && <Spinner animation="border" size="sm" />}{" "} {t("vehicles.create")}
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </Form>
  );
};

export default AdminNewVehiclePage;
