import ReactInputMask from "react-input-mask-next";
import { FloatingLabel, Form } from "react-bootstrap";
import { utils } from "../../../utils";

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
            type: type,
            min: min,
            list: listId
        };
        // Native date/time/month inputs only reliably open their picker on a
        // click that lands exactly on the small calendar/clock icon — the
        // rest of the field just focuses/selects text. A double-click
        // anywhere on the field opens it explicitly instead, via the same
        // showPicker() feature-detection KbsSection's date field already uses.
        if (["date", "time", "month"].includes(type) && !disabled) {
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
