import { useEffect, useMemo, useState } from "react";
import { Form } from "react-bootstrap";
import "./searchable-select.scss";

const normalize = (s) => (s || "").toLocaleLowerCase("tr");

// A plain text input that opens a filtered dropdown of `items` on focus/typing
// — a searchable stand-in for a native <select> when the list is long enough
// that typing a plate or brand/model beats scrolling it (e.g. picking one
// vehicle out of a whole fleet). Controlled: caller owns `value`.
const SearchableCombobox = ({
  value,
  onChange,
  onBlur,
  items = [],
  placeholder = "",
  disabled = false,
  isInvalid = false,
  id,
  size,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = items.find((item) => item.value === value) || null;

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return items;
    return items.filter((item) => normalize(item.name).includes(q));
  }, [items, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const commit = (item) => {
    onChange(item ? item.value : "");
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) commit(filtered[highlight]);
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div className="searchable-combobox">
      <Form.Control
        id={id}
        size={size}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        isInvalid={isInvalid}
        placeholder={placeholder}
        value={open ? query : selected?.name || ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        // A click right after picking an option doesn't re-fire focus — the
        // input never actually blurred (the option's onMouseDown prevented
        // that on purpose, so the click lands before any blur-driven close).
        // Re-open explicitly here so a second click still works.
        onClick={() => {
          if (!open) {
            setOpen(true);
            setQuery("");
          }
        }}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false);
          setQuery("");
          if (onBlur) onBlur();
        }}
      />
      {open && (
        // onMouseDown (not onClick) + preventDefault keeps focus on the input
        // through the click, so the option's own onClick still fires instead
        // of the blur handler closing the menu first.
        <ul className="searchable-combobox__menu" onMouseDown={(e) => e.preventDefault()}>
          {filtered.length === 0 && <li className="searchable-combobox__empty">Sonuç bulunamadı</li>}
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              className={
                "searchable-combobox__option" +
                (idx === highlight ? " is-highlighted" : "") +
                (item.value === value ? " is-selected" : "")
              }
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => commit(item)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchableCombobox;
