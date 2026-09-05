import { useTranslation } from "react-i18next";
import { Badge, Button, Col, Form, Row } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import EditableSelectField from "./editable-select-field";
import RegistrationScan from "./registration-scan";

// Ruhsattan okunan alanları formik'e aktarır — boş/okunamayan alanlar dokunulmadan kalır.
const REGISTRATION_FIELDS = [
  "brand", "model", "licensePlate", "modelYear", "chassisNo",
  "engineNo", "color", "fuelType", "registrationSerialNo", "registrationDate",
];

// The "Araç" tab: image upload column + the grouped identity/registration
// fields + notes + the out-of-service switch.
const VehicleIdentityTab = ({
  formik, disabled, sections, imageSrc, imageError, fileImageRef, onImageChange, handleModelPicked,
}) => {
  const { t } = useTranslation("admin");

  const handleRegistrationExtracted = (fields) => {
    REGISTRATION_FIELDS.forEach((key) => {
      const value = fields?.[key];
      if (value !== undefined && value !== null && value !== "") {
        formik.setFieldValue(key, key === "modelYear" ? String(value) : value);
      }
    });
  };

  return (
    <fieldset disabled={disabled}>
      <Row>
        <Col xl={3} className="vehicle-form__image image-area">
          {imageSrc && <img src={imageSrc} alt={formik.values.model} title={formik.values.model} />}
          <Form.Group>
            <Form.Control
              type="file"
              name="image"
              accept=".jpg,.jpeg,.png"
              ref={fileImageRef}
              onChange={onImageChange}
              id="selectImage"
              className="d-none"
            />
            <div className="cover">
              <Button as={Form.Label} htmlFor="selectImage">{t("vehicles.selectImage")}</Button>
            </div>
          </Form.Group>
          {imageError && <Badge bg="danger" className="image-error">{imageError}</Badge>}
        </Col>
        <Col xl={9}>
          <div className="vehicle-form__registration-scan-bar">
            <RegistrationScan onExtracted={handleRegistrationExtracted} />
            <span className="text-muted">{t("vehicles.registrationScan.hint")}</span>
          </div>
          {sections.map((section) => (
            <div key={section.key} className="vehicle-form__section">
              <h4>{t(`vehicles.sections.${section.key}`)}</h4>
              <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3">
                {section.items.map((item) =>
                  item.editableSelect ? (
                    <EditableSelectField
                      key={item.name}
                      formik={formik}
                      name={item.name}
                      label={t(`vehicles.form.${item.name}`)}
                      options={item.options}
                      onValuePicked={item.autofillBrand ? handleModelPicked : undefined}
                    />
                  ) : (
                    <CustomForm
                      key={item.name}
                      formik={formik}
                      asGroup={Col}
                      name={item.name}
                      label={t(`vehicles.form.${item.name}`)}
                      type={item.type || "text"}
                      itemsArr={item.itemsArr || []}
                      list={item.list}
                    />
                  )
                )}
              </Row>
            </div>
          ))}

          <CustomForm formik={formik} name="notes" label={t("vehicles.form.notes")} type="textarea" rows={3} />

          <Form.Check
            type="switch"
            id="outOfService"
            name="outOfService"
            label={t("vehicles.outOfService")}
            checked={formik.values.outOfService}
            onChange={formik.handleChange}
            className="mt-2"
          />
        </Col>
      </Row>
    </fieldset>
  );
};

export default VehicleIdentityTab;
