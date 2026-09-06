import "./initials-avatar.scss";

// First letters of the first two name parts, e.g. "System Admin" -> "SA".
const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

// Letter avatar on a brand-green disc — a lighter, more modern stand-in for a
// large outline person icon. `size` is the diameter in px.
const InitialsAvatar = ({ name, size = 40, className = "" }) => (
  <span
    className={`initials-avatar ${className}`.trim()}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    aria-hidden="true"
  >
    {initialsOf(name)}
  </span>
);

export default InitialsAvatar;
