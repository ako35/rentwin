import { Form } from "react-bootstrap";
import { custLabel } from "../contract-helpers";

// Presentational typeahead: a small text input with an absolute dropdown of
// customer rows. The parent owns the query state, the already-filtered options
// and what happens on pick / on empty. Used by the driver and reference-account
// pickers on the contract screen.
const CustomerTypeahead = ({
  query, onQueryChange, open, options, onPick,
  placeholder, autoFocus, onFocus, onBlur, emptyContent,
}) => (
  <div className="contract-page__typeahead">
    <Form.Control
      size="sm"
      autoComplete="off"
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
    />
    {open && (
      <ul className="contract-page__typeahead-list">
        {options.map((u) => (
          <li key={u.id} onMouseDown={() => onPick(u)}>
            {custLabel(u)}
          </li>
        ))}
        {options.length === 0 && emptyContent}
      </ul>
    )}
  </div>
);

export default CustomerTypeahead;
