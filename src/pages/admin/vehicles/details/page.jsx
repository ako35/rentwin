import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Col,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { constants } from "../../../../constants";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../utils";
import { CustomForm, Loading } from "../../../../components";
import "./style.scss";
import { services } from "../../../../services";

const { routes } = constants;

const API_URL = import.meta.env.VITE_APP_API_URL;

const AdminVehicleDetailsPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");

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

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fileImageRef = useRef();
  const { vehicleId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState({
    brand: "",
    model: "",
    licensePlate: "",
    doors: "",
    seats: "",
    luggage: "",
    age: "",
    pricePerHour: "",
    transmission: constants.transmissionTypes[0].value,
    airConditioning: constants.airConditioningTypes[0].value,
    fuelType: constants.fuelTypes[0].value,
    outOfService: false,
    image: [],
  });

  const onSubmit = async (values) => {
    setUpdating(true);

    try {
      let imageId = values.image[0];
      if (imageChanged) {
        if (values.image.length > 1) {
          values.image.array.forEach(async (image) => {
            await services.vehicle.deleteVehicleImage(image);
          });
        } else {
          if (imageId) {
            await services.vehicle.deleteVehicleImage(imageId);
          }
        }

        const newImageFile = fileImageRef.current.files[0];
        const formData = new FormData();
        formData.append("file", newImageFile);

        const response = await services.vehicle.uploadVehicleImage(formData);

        imageId = response.imageId;
        setImageChanged(false);
      }

      const payload = { ...values };
      delete payload.image;

      await services.vehicle.updateVehicle(vehicleId, imageId, payload);
      utils.functions.swalToast(t("vehicles.toasts.updateSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(
        t("vehicles.toasts.updateError"),
        "error"
      );
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

  // const handleSelectImage = () => {
  //   fileImageRef.current.click();
  // };

  const handleImageChange = () => {
    const file = fileImageRef.current.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImageSrc(reader.result);
      setImageChanged(true);
    };
  };

  const loadData = async () => {
    try {
      const response = await services.vehicle.getVehicleById(vehicleId);
      setInitialValues(response);
      setImageSrc(`${API_URL}/files/display/${response.image[0]}`);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    utils.functions
      .swalQuestion(
        t("vehicles.toasts.deleteConfirmTitle"),
        t("vehicles.toasts.deleteConfirmText")
      )
      .then((result) => {
        if (result.isConfirmed) {
          removeVehicle();
        }
      });
  };

  const removeVehicle = async () => {
    setDeleting(true);
    try {
      await services.vehicle.deleteVehicle(vehicleId);
      await utils.functions.swalToast(t("vehicles.toasts.deleteSuccess"), "success");
      navigate(`${routes.adminVehicles}`);
    } catch (error) {
      utils.functions.swalToast(
        t("vehicles.toasts.deleteError"),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return loading ? (
    <Loading height={500} />
  ) : (
    <Form noValidate onSubmit={formik.handleSubmit}>
      <div className="admin-vehicle-details-form">
        <fieldset disabled={formik.values.builtIn}>
          <Row className="align-items-center">
            <Col xl={3} className="image-area">
              {!loaded && <Loading height={200} />}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={formik?.values?.model}
                  title={formik?.values?.model}
                  style={{ display: loaded ? "block" : "none" }}
                  onLoad={() => setLoaded(true)}
                />
              )}
              <Form.Group>
                <Form.Control
                  type="file"
                  name="image"
                  accept=".jpg,.png,.jpeg"
                  ref={fileImageRef}
                  onChange={handleImageChange}
                  id="selectImage"
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
        </fieldset>
        {formik.values.builtIn && (
          <Alert variant="warning" className="mt-5">
            {t("vehicles.builtInWarning")}
          </Alert>
        )}
        <div className="text-end">
          <ButtonGroup>
            <Button onClick={() => navigate(`${routes.adminVehicles}`)}>
              {t("vehicles.cancel")}
            </Button>
            {!formik.values.builtIn && (
              <>
                <Button
                  type="submit"
                  disabled={
                    (!imageChanged && !(formik.dirty && formik.isValid)) ||
                    updating
                  }
                >
                  {updating && <Spinner animation="border" size="sm" />}{" "} {t("vehicles.update")}
                </Button>
                <Button
                  variant="danger"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting && <Spinner animation="border" size="sm" />}{" "} {t("vehicles.delete")}
                </Button>
              </>
            )}
          </ButtonGroup>
        </div>
      </div>
    </Form>
  );
};

export default AdminVehicleDetailsPage;
