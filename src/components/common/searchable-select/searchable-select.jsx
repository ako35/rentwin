import { Form } from "react-bootstrap";
import { utils } from "../../../utils";
import SearchableCombobox from "./searchable-combobox";

// Formik-wired wrapper around SearchableCombobox — mirrors CustomForm's
// "select" case (Form.Group + Form.Label + validation feedback) for fields
// where the list is worth filtering by typing instead of scrolling.
const SearchableSelect = ({ formik, name, label, itemsArr = [], disabled = false, asGroup }) => {
  const { isInvalid } = utils.functions.validCheck(name, formik);

  return (
    <Form.Group as={asGroup} className="mb-3">
      <Form.Label>{label}</Form.Label>
      <SearchableCombobox
        id={name}
        value={formik.values[name]}
        onChange={(value) => formik.setFieldValue(name, value)}
        onBlur={() => formik.setFieldTouched(name, true)}
        items={itemsArr}
        disabled={disabled}
        isInvalid={!!isInvalid}
      />
      <Form.Control.Feedback type="invalid" style={{ display: isInvalid ? "block" : "none" }}>
        {formik.errors[name]}
      </Form.Control.Feedback>
    </Form.Group>
  );
};

export default SearchableSelect;
