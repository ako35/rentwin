import { useTranslation } from "react-i18next";
import { Alert, Col, Form, Row } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import EditableSelectField from "./editable-select-field";
import RegistrationScan from "./registration-scan";
import ModelImagePreview from "./model-image-preview";

// Ruhsattan okunan alanları formik'e aktarır — boş/okunamayan alanlar dokunulmadan kalır.
const REGISTRATION_FIELDS = [
  "brand", "model", "licensePlate", "modelYear", "chassisNo",
  "engineNo", "color", "fuelType", "registrationSerialNo", "registrationDate",
];

// The "Araç" tab: model-image preview column + the grouped identity/registration
// fields + notes + the out-of-service switch.
const VehicleIdentityTab = ({ formik, disabled, sections, handleModelPicked, plateTaken }) => {
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
        <Col xl={3} className="vehicle-form__image">
          <ModelImagePreview brand={formik.values.brand} model={formik.values.model} />
        </Col>
        <Col xl={9} className="vehicle-form__fields">
          <div className="vehicle-form__registration-scan-bar">
            <RegistrationScan onExtracted={handleRegistrationExtracted} />
            <span className="text-muted">{t("vehicles.registrationScan.hint")}</span>
          </div>
          {plateTaken && (
            <Alert variant="warning" className="py-2 px-3 mb-3">
              {t("vehicles.form.plateTakenWarning")}
            </Alert>
          )}
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
