import { Link } from "react-router-dom";
import "./row-link.scss";

// Makes an entire <tr> behave like a real link — right-click "yeni sekmede
// aç", ctrl/cmd-click and middle-click all work natively, unlike a plain
// onClick={() => navigate(...)} handler, which the browser can't offer a
// link context menu for. Render as an extra child inside the row's first
// <td>; CSS (row-link.scss) stretches it to cover the whole row via the
// row's own "row-link-host" class.
const RowLink = ({ to, label }) => <Link to={to} className="row-link" aria-label={label} />;

export default RowLink;
