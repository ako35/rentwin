// react-data-table-component paints its surface with inline styles that neither
// Bootstrap's data-bs-theme nor a stylesheet can reach. Feed it the same
// `--rw-*` tokens the rest of the admin panel uses so these tables follow the
// light / dark theme too. In light mode the tokens resolve to the component's
// usual white, so nothing visually changes there.
export const dataTableStyles = {
  table: { style: { backgroundColor: "var(--rw-panel)" } },
  responsiveWrapper: { style: { backgroundColor: "var(--rw-panel)" } },
  headRow: {
    style: { backgroundColor: "var(--rw-panel-2)", color: "var(--rw-ink)", borderBottomColor: "var(--rw-line)" },
  },
  headCells: { style: { color: "var(--rw-ink-muted)" } },
  rows: {
    style: { backgroundColor: "var(--rw-panel)", color: "var(--rw-ink)" },
    stripedStyle: { backgroundColor: "var(--rw-panel-2)", color: "var(--rw-ink)" },
    highlightOnHoverStyle: {
      backgroundColor: "var(--rw-hover)",
      color: "var(--rw-ink)",
      borderBottomColor: "var(--rw-line)",
      outline: "none",
    },
  },
  cells: { style: { color: "var(--rw-ink)" } },
  pagination: {
    style: { backgroundColor: "var(--rw-panel)", color: "var(--rw-ink-muted)", borderTopColor: "var(--rw-line)" },
    pageButtonsStyle: {
      fill: "var(--rw-ink-muted)",
      "&:disabled": { fill: "var(--rw-ink-subtle)" },
      "&:hover:not(:disabled)": { backgroundColor: "var(--rw-hover)" },
      "&:focus": { backgroundColor: "var(--rw-hover)" },
    },
  },
  noData: { style: { backgroundColor: "var(--rw-panel)", color: "var(--rw-ink-muted)" } },
  progress: { style: { backgroundColor: "var(--rw-panel)", color: "var(--rw-ink)" } },
};
