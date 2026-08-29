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

    let properties = {
        ...fieldProps,
        ...utils.functions.validCheck(name, formik),
        disabled,
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
