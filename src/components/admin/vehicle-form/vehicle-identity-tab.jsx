import { useTranslation } from "react-i18next";
import { Badge, Button, Col, Form, Row } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import EditableSelectField from "./editable-select-field";

// The "Araç" tab: image upload column + the grouped identity/registration
// fields + notes + the out-of-service switch.
const VehicleIdentityTab = ({
  formik, disabled, sections, imageSrc, imageError, fileImageRef, onImageChange, handleModelPicked,
}) => {
  const { t } = useTranslation("admin");

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
