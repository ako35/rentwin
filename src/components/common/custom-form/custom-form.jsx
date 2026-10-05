import ReactInputMask from "react-input-mask-next";
import { FloatingLabel, Form } from "react-bootstrap";
import moment from "moment/moment";
import { utils } from "../../../utils";
import SearchableSelect from "../searchable-select/searchable-select";

const CustomForm = (props) => {
    const {
        asGroup,
        asInput,
        disabled = false,
        floating,
        formik,
        itemsArr = [],
        label,
        list,
        mask,
        name,
        onFieldChange,
        placeholder,
        rows,
        type = "text",
        min
    } = props;

    // Native combobox: <input list> + <datalist> — click shows suggestions, free text still allowed.
    const listId = list && list.length ? `${name}-datalist` : undefined;

    const fieldProps = formik.getFieldProps(name);

    // A truly `disabled` native input can't have its value selected or
    // copied at all — no text selection, no right-click copy, nothing. For a
    // locked date/time/month field that's a real loss (e.g. a contract's
    // fixed pick-up date the operator wants to copy elsewhere), so those
    // render as `readOnly` instead: same "can't edit this" outcome, but the
    // value stays selectable. The disabled *look* is preserved via the
    // `.form-control[readonly]` rules that mirror `:disabled` (see
    // contracts details/style.scss and _admin-dark.scss).
    const lockedAsReadOnly = disabled && ["date", "time", "month"].includes(type);

    let properties = {
        ...fieldProps,
        ...utils.functions.validCheck(name, formik),
        disabled: lockedAsReadOnly ? false : disabled,
        readOnly: lockedAsReadOnly,
    };

    // Let callers react to a change (e.g. auto-fill a sibling field) without losing formik's handler.
    if (onFieldChange) {
        properties.onChange = (event) => {
            fieldProps.onChange(event);
            onFieldChange(event);
        };
    }

    if (["text", "date", "month", "time", "number", "email"].includes(type)) {
        properties = {
            ...properties,
            as: asInput === "ReactInputMask" ? ReactInputMask : asInput,
            mask: mask,
            placeholder: placeholder,
            // A native date/time/month input's value can only ever be
            // selected/copied one day-or-month-or-year(-or-hour) segment at a
            // time (it's a compound spinner control, not a plain text run) —
            // no interaction selects the whole thing, and .select() is a
            // silent no-op on these types. A locked field renders as plain
            // text instead, so the value is one ordinary selectable/copyable
            // string and .select() below actually does something.
            type: lockedAsReadOnly ? "text" : type,
            min: min,
            list: listId
        };
        if (lockedAsReadOnly && type === "date" && fieldProps.value) {
            properties.value = moment(fieldProps.value, "YYYY-MM-DD").format("DD.MM.YYYY");
        }
        if (lockedAsReadOnly) {
            // .select() grabs the whole value regardless of internal punctuation
            // (dots, colons) — unlike a native double-click's word-boundary
            // selection, which would otherwise only grab one segment.
            properties.onDoubleClick = (event) => event.currentTarget.select();
        } else if (["date", "time", "month"].includes(type)) {
            // Native date/time/month inputs only reliably open their picker on a
            // click that lands exactly on the small calendar/clock icon — the
            // rest of the field just focuses/selects text. A double-click
            // anywhere on the field opens it explicitly instead, via the same
            // showPicker() feature-detection KbsSection's date field already uses.
            properties.onDoubleClick = (event) => {
                const el = event.currentTarget;
                if (typeof el.showPicker === "function") el.showPicker();
            };
        }
    } else if (type === "textarea") {
        properties = {
            ...properties,
            as: type,
            rows: rows,
        };
    }

    switch (type) {
        case "text":
        case "date":
        case "month":
        case "time":
        case "number":
        case "email":
        case "textarea":
            return floating ? (
                <FloatingLabel label={label} className="mb-3">
                    <Form.Control {...properties} />
                    {listId && (
                        <datalist id={listId}>
                            {list.map((option) => (
                                <option key={option.value ?? option} value={option.value ?? option}>
                                    {option.label}
                                </option>
                            ))}
                        </datalist>
                    )}
                    <Form.Control.Feedback type="invalid">
                        {formik.errors[name]}
                    </Form.Control.Feedback>
                </FloatingLabel>
            ) : (
                <Form.Group as={asGroup} className="mb-3">
                    <Form.Label>{label}</Form.Label>
                    <Form.Control {...properties} />
                    {listId && (
                        <datalist id={listId}>
                            {list.map((option) => (
                                <option key={option.value ?? option} value={option.value ?? option}>
                                    {option.label}
                                </option>
                            ))}
                        </datalist>
                    )}
                    <Form.Control.Feedback type="invalid">
                        {formik.errors[name]}
                    </Form.Control.Feedback>
                </Form.Group>
            );
        case "select":
            return (
                <Form.Group as={asGroup} className="mb-3">
                    <Form.Label>{label}</Form.Label>
                    <Form.Select {...properties}>
                        {itemsArr.map((item) => (
                            <option key={item.id} value={item.value}>
                                {item.name}
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>
            );
        case "searchable-select":
            return (
                <SearchableSelect
                    formik={formik} name={name} label={label}
                    itemsArr={itemsArr} disabled={disabled} asGroup={asGroup}
                />
            );
        case "checkbox":
            return <>CHECKBOX</>;
        case "radio":
            return <>RADIO</>;
        case "file":
            return <>FILE</>;
        default:
            break;
    }

    return <div>CustomForm</div>;
};

export default CustomForm;
