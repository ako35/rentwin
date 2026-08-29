import { useEffect, useRef, useState } from "react";
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

const API_URL = import.meta.env.VITE_APP_API_URL;

const toDateInput = (value) => (value ? utils.functions.getDate(value) : "");
const toText = (value) => value ?? "";

const AdminVehicleDetailsPage = () => {
  const { t } = useTranslation("admin");

  const [loading, setLoading] = useState(true);
  const [imageChanged, setImageChanged] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vehicle, setVehicle] = useState(null);

  const fileImageRef = useRef();
  const { vehicleId } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = useState({
    ...utils.initialValues.adminNewVehicleFormInitialValues,
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
        } else if (imageId) {
          await services.vehicle.deleteVehicleImage(imageId);
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
      utils.functions.swalToast(t("vehicles.toasts.updateError"), "error");
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
      setVehicle(response);
      setInitialValues({
        ...utils.initialValues.adminNewVehicleFormInitialValues,
        ...response,
        branchId: toText(response.branchId),
        ownershipType: toText(response.ownershipType),
        chassisNo: toText(response.chassisNo),
        engineNo: toText(response.engineNo),
        color: toText(response.color),
        notes: toText(response.notes),
        registrationSerialNo: toText(response.registrationSerialNo),
        modelYear: response.modelYear ?? "",
        currentKm: response.currentKm ?? "",
        registrationDate: toDateInput(response.registrationDate),
        nextMaintenanceDate: toDateInput(response.nextMaintenanceDate),
        nextInspectionDate: toDateInput(response.nextInspectionDate),
        image: response.image,
      });
      setImageSrc(`${API_URL}/files/display/${response.image[0]}`);
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
        t("vehicles.toasts.deleteConfirmText")
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
        imageSrc={imageSrc}
        fileImageRef={fileImageRef}
        onImageChange={handleImageChange}
        disabled={formik.values.builtIn}
        builtInWarning={formik.values.builtIn}
      >
        <ButtonGroup>
          <Button variant="outline-primary" onClick={() => navigate(`${routes.adminVehicles}`)}>
            {t("vehicles.cancel")}
          </Button>
          {!formik.values.builtIn && (
            <>
              <Button
                type="submit"
                disabled={(!imageChanged && !(formik.dirty && formik.isValid)) || updating}
              >
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
