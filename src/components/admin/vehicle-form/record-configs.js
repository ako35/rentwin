import { constants } from "../../../constants";
import { utils } from "../../../utils";

// Column render kinds: "text" (default) | "date" | "money" | "number" | "option".
// "option" columns / selects resolve their label from common.json -> options[optionNs].

export const RECORD_CONFIGS = {
  insurance: {
    resource: "insurances",
    tabKey: "insurance",
    initialValues: utils.initialValues.vehicleInsuranceInitialValues,
    schema: utils.validations.vehicleInsuranceValidationSchema,
    // Two-pane layout (kolayCAR style): left = Sigorta + Kasko lists with totals,
    // right = inline add/edit form.
    twoPane: true,
    typeField: "type",
    totalField: "premium",
    groups: [
      { key: "sigorta", type: "Traffic" },
      { key: "kasko", type: "Kasko" },
    ],
    listColumns: [
      { key: "policyNo" },
      { key: "startDate", kind: "date" },
      { key: "endDate", kind: "date" },
      { key: "premium", kind: "money" },
    ],
    columns: [
      { key: "type", kind: "option", optionNs: "insuranceTypes" },
      { key: "company" },
      { key: "policyNo" },
      { key: "startDate", kind: "date" },
      { key: "endDate", kind: "date" },
      { key: "premium", kind: "money" },
    ],
    fields: [
      { name: "type", type: "select", options: constants.insuranceTypes, optionNs: "insuranceTypes" },
      { name: "company" },
      { name: "policyNo" },
      { name: "startDate", type: "date" },
      { name: "endDate", type: "date" },
      { name: "premium", type: "number" },
      { name: "notes", type: "textarea", rows: 2, full: true },
    ],
  },

  tax: {
    resource: "taxes",
    tabKey: "tax",
    initialValues: utils.initialValues.vehicleTaxInitialValues,
    schema: utils.validations.vehicleTaxValidationSchema,
    columns: [
      { key: "period" },
      { key: "installment" },
      { key: "amount", kind: "money" },
      { key: "dueDate", kind: "date" },
      { key: "paidDate", kind: "date" },
    ],
    fields: [
      { name: "period", type: "number" },
      { name: "installment", type: "select", options: constants.taxInstallments },
      { name: "amount", type: "number" },
      { name: "dueDate", type: "date" },
      { name: "paidDate", type: "date" },
      { name: "notes", type: "textarea", rows: 2, full: true },
    ],
  },

  maintenance: {
    resource: "maintenances",
    tabKey: "maintenance",
    initialValues: utils.initialValues.vehicleMaintenanceInitialValues,
    schema: utils.validations.vehicleMaintenanceValidationSchema,
    columns: [
      { key: "type", kind: "option", optionNs: "maintenanceTypes" },
      { key: "date", kind: "date" },
      { key: "odometer", kind: "number" },
      { key: "vendor" },
      { key: "cost", kind: "money" },
      { key: "nextDate", kind: "date" },
    ],
    fields: [
      { name: "type", type: "select", options: constants.maintenanceTypes, optionNs: "maintenanceTypes" },
      { name: "date", type: "date" },
      { name: "odometer", type: "number" },
      { name: "vendor" },
      { name: "description", type: "textarea", rows: 2, full: true },
      { name: "cost", type: "number" },
      { name: "nextDate", type: "date" },
      { name: "nextOdometer", type: "number" },
    ],
  },

  inspection: {
    resource: "inspections",
    tabKey: "inspection",
    initialValues: utils.initialValues.vehicleInspectionInitialValues,
    schema: utils.validations.vehicleInspectionValidationSchema,
    columns: [
      { key: "type", kind: "option", optionNs: "inspectionTypes" },
      { key: "date", kind: "date" },
      { key: "result", kind: "option", optionNs: "inspectionResults" },
      { key: "expiryDate", kind: "date" },
      { key: "station" },
      { key: "cost", kind: "money" },
    ],
    fields: [
      { name: "type", type: "select", options: constants.inspectionTypes, optionNs: "inspectionTypes" },
      { name: "date", type: "date" },
      { name: "result", type: "select", options: constants.inspectionResults, optionNs: "inspectionResults" },
      { name: "expiryDate", type: "date" },
      { name: "station" },
      { name: "cost", type: "number" },
      { name: "notes", type: "textarea", rows: 2, full: true },
    ],
  },
};

// Date-typed field names for a config, used to normalise API rows into <input type=date> values.
export const dateFieldNames = (config) =>
  config.fields.filter((f) => f.type === "date").map((f) => f.name);
