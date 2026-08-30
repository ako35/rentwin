import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Col, Form, Nav, Row } from "react-bootstrap";
import CustomForm from "../../common/custom-form/custom-form";
import EditableSelectField from "./editable-select-field";
import { constants } from "../../../constants";
import { services } from "../../../services";
import { utils } from "../../../utils";
import RecordsPanel from "./records-panel";
import { RECORD_CONFIGS } from "./record-configs";
import "./vehicle-form.scss";

const RECORD_TABS = ["insurance", "tax", "maintenance", "inspection"];

const VehicleForm = ({
  mode,
  formik,
  vehicleId,
  vehicle,
  imageSrc,
  imageError,
  fileImageRef,
  onImageChange,
  disabled = false,
  builtInWarning = false,
  children,
}) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const [branches, setBranches] = useState([]);
  // Distinct brand/model pairs already present in the fleet — the picklist source.
  const [fleet, setFleet] = useState([]);
  const [tab, setTab] = useState("vehicle");

  useEffect(() => {
    services.branch.getBranches().then(setBranches).catch(() => setBranches([]));
    services.vehicle
      .getVehicles()
      .then((list) =>
        setFleet(
          (list || [])
            .map((v) => ({ brand: (v.brand || "").trim(), model: (v.model || "").trim() }))
            .filter((v) => v.brand || v.model)
        )
      )
      .catch(() => setFleet([]));
  }, []);

  const selectedBrand = (formik.values.brand || "").trim().toLowerCase();

  const brandOptions = useMemo(
    () => [...new Set(fleet.map((v) => v.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [fleet]
  );

  // Models already used for the selected brand; falls back to every known model
  // when the brand is new / unmatched.
  const modelOptions = useMemo(() => {
    const forBrand = fleet.filter((v) => v.brand.toLowerCase() === selectedBrand && v.model);
    const source = forBrand.length ? forBrand : fleet;
    return [...new Set(source.map((v) => v.model).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [fleet, selectedBrand]);

  // Picking a model that belongs to exactly one brand in the fleet auto-fills Marka.
  const handleModelPicked = (model) => {
    const key = model.trim().toLowerCase();
    if (!key) return;
    const matchedBrands = [
      ...new Set(
        fleet.filter((v) => v.model.toLowerCase() === key).map((v) => v.brand).filter(Boolean)
      ),
    ];
    if (matchedBrands.length === 1 && matchedBrands[0] !== formik.values.brand) {
      formik.setFieldValue("brand", matchedBrands[0]);
    }
  };

  const sections = useMemo(() => {
    const withNames = (arr, resolve) => arr.map((item) => ({ ...item, name: resolve(item) }));

    return [
      {
        key: "identity",
        items: [
          { name: "brand", editableSelect: true, options: brandOptions },
          { name: "model", editableSelect: true, options: modelOptions, autofillBrand: true },
          { name: "licensePlate" },
          { name: "modelYear", type: "number" },
          { name: "chassisNo" },
          { name: "engineNo" },
          { name: "color" },
          { name: "currentKm", type: "number" },
          { name: "doors", type: "number" },
          { name: "seats", type: "number" },
          { name: "luggage", type: "number" },
          { name: "age", type: "number" },
          {
            name: "transmission",
            type: "select",
            itemsArr: withNames(constants.transmissionTypes, (i) =>
              tCommon(`options.transmissionTypes.${i.value}`)
            ),
          },
          {
            name: "fuelType",
            type: "select",
            itemsArr: withNames(constants.fuelTypes, (i) => tCommon(`options.fuelTypes.${i.value}`)),
          },
          {
            name: "airConditioning",
            type: "select",
            itemsArr: withNames(constants.airConditioningTypes, (i) =>
              tCommon(`options.airConditioning.${i.value ? "yes" : "no"}`)
            ),
          },
          { name: "pricePerHour", type: "number" },
        ],
      },
      {
        key: "registration",
        items: [
          {
            name: "ownershipType",
            type: "select",
            itemsArr: [
              { id: "none", value: "", name: "—" },
              ...withNames(constants.ownershipTypes, (i) =>
                tCommon(`options.ownershipTypes.${i.value}`)
              ),
            ],
          },
          { name: "registrationSerialNo" },
          { name: "registrationDate", type: "date" },
          {
            name: "branchId",
            type: "select",
            itemsArr: [
              { id: "", value: "", name: t("filterBar.allBranches") },
              ...branches.map((branch) => ({ id: branch.id, value: branch.id, name: branch.name })),
            ],
          },
        ],
      },
      {
        key: "operational",
        items: [
          { name: "nextMaintenanceDate", type: "date" },
          { name: "nextInspectionDate", type: "date" },
        ],
      },
    ];
  }, [branches, brandOptions, modelOptions, t, tCommon]);

  const title =
    [formik.values.brand, formik.values.model].filter(Boolean).join(" ") || t("vehicles.newTitle");

  return (
    <div className="vehicle-form">
      <header className="vehicle-form__header">
        <div className="vehicle-form__title">
          <span className="vehicle-form__plate">
            {formik.values.licensePlate || t("vehicles.form.licensePlate")}
          </span>
          <span className="vehicle-form__name">{title}</span>
        </div>
        {mode === "edit" && vehicle && (
          <div className="vehicle-form__meta">
            {vehicle.createdAt && (
              <span>
                {t("vehicles.createdAt")}: {utils.functions.getDate(vehicle.createdAt)}
              </span>
            )}
            {vehicle.updatedAt && (
              <span>
                {t("vehicles.updatedAt")}: {utils.functions.formatDateTime(vehicle.updatedAt)}
              </span>
            )}
          </div>
        )}
      </header>

      <Nav
        variant="tabs"
        className="vehicle-form__tabs"
        activeKey={tab}
        onSelect={(key) => key && setTab(key)}
      >
        <Nav.Item>
          <Nav.Link eventKey="vehicle">{t("vehicles.tabs.vehicle")}</Nav.Link>
        </Nav.Item>
        {RECORD_TABS.map((key) => (
          <Nav.Item key={key}>
            <Nav.Link eventKey={key}>{t(`vehicles.tabs.${key}`)}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <div className="vehicle-form__body">
        {tab === "vehicle" && (
          <fieldset disabled={disabled}>
            <Row>
              <Col xl={3} className="vehicle-form__image image-area">
                {imageSrc && (
                  <img src={imageSrc} alt={formik.values.model} title={formik.values.model} />
                )}
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
                    <Button as={Form.Label} htmlFor="selectImage">
                      {t("vehicles.selectImage")}
                    </Button>
                  </div>
                </Form.Group>
                {imageError && (
                  <Badge bg="danger" className="image-error">
                    {imageError}
                  </Badge>
                )}
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

                <CustomForm
                  formik={formik}
                  name="notes"
                  label={t("vehicles.form.notes")}
                  type="textarea"
                  rows={3}
                />

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
        )}

        {RECORD_TABS.map(
          (key) =>
            tab === key && (
              <RecordsPanel key={key} vehicleId={vehicleId} config={RECORD_CONFIGS[key]} />
            )
        )}
      </div>

      {builtInWarning && (
        <Alert variant="warning" className="mt-4">
          {t("vehicles.builtInWarning")}
        </Alert>
      )}

      <div className="vehicle-form__footer">{children}</div>
    </div>
  );
};

export default VehicleForm;
