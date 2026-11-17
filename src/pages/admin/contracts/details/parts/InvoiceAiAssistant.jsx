import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner, Table } from "react-bootstrap";
import { BsExclamationTriangleFill, BsStars } from "react-icons/bs";
import { services } from "../../../../../services";
import { utils } from "../../../../../utils";
import "./invoice-ai.scss";

const trDate = (iso) => (iso ? iso.split("-").reverse().join(".") : "…");
// "ALİAĞA VERGİ DAİRESİ" already says it — only bare names get " VD".
const vd = (office) => (/VERG[İI]s*DA[İI]RES|(^|s)V.?D.?$/i.test(office) ? office : `${office} VD`);

// "Yapay zekâ ile hazırla": the admin writes an instruction, Claude picks the
// period and billable items, the backend prices them from the contract
// (modules/contracts/invoice-draft.js). Nothing is saved here — the draft is
// either copied into the e-Fatura portal (TÜRMOB / Unidox) or applied to the
// regular invoice form, where the real invoice number is entered after the
// invoice is actually issued.
const InvoiceAiAssistant = ({ contractId, money, onApply, onClose }) => {
  const { t } = useTranslation("admin");
  const a = (key, opts) => t(`reservations.contract.invoice.ai.${key}`, opts);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);

  const examples = [a("example1"), a("example2"), a("example3")];

  const run = async (text = instruction) => {
    const value = text.trim();
    if (!value || busy) return;
    setInstruction(value);
    setBusy(true);
    setDraft(null);
    try {
      setDraft(await services.contract.draftInvoiceWithAi(contractId, value));
    } catch (err) {
      utils.functions.swalToast(err?.response?.data?.message || a("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  // Plain text in the order the e-Fatura portal asks for it.
  const copyLines = async () => {
    const b = draft.billTo;
    const rows = draft.lines.map(
      (l, i) =>
        `${i + 1}) ${l.description} — ${l.quantity} ${l.unit} × ${money(l.unitPriceNet)} TL, KDV %${l.vatRate} — ${a("lineNet")} ${money(l.netAmount)} TL`
    );
    const text = [
      `${a("buyer")}: ${b.title}${b.taxNo ? ` (${b.taxNoLabel} ${b.taxNo}${b.taxOffice ? `, ${vd(b.taxOffice)}` : ""})` : ""}`,
      b.address ? `${a("address")}: ${b.address}` : null,
      draft.periodFrom ? `${a("period")}: ${trDate(draft.periodFrom)} – ${trDate(draft.periodTo)}` : null,
      ...rows,
      `${a("net")}: ${money(draft.netTotal)} TL · KDV: ${money(draft.taxTotal)} TL · ${a("gross")}: ${money(draft.grossTotal)} TL`,
      draft.note ? `${a("note")}: ${draft.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      utils.functions.swalToast(a("copied"), "success", 2500);
    } catch {
      utils.functions.swalToast(a("copyError"), "error");
    }
  };

  return (
    <div className="contract-page__inv-card inv-ai">
      <div className="contract-page__inv-card-head inv-ai__head">
        <span>
          <BsStars /> {a("title")}
        </span>
        <button type="button" className="inv-ai__close" onClick={onClose} aria-label={a("close")}>
          ×
        </button>
      </div>

      {/* No <form> here: this panel sits inside the contract page's own form,
          and a nested form submit reloads the page. Enter / the button call run(). */}
      <div>
        <Form.Control
          as="textarea"
          rows={2}
          maxLength={500}
          value={instruction}
          placeholder={a("placeholder")}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
          disabled={busy}
        />
        <div className="inv-ai__bar">
          <div className="inv-ai__examples">
            {examples.map((ex) => (
              <button key={ex} type="button" disabled={busy} onClick={() => run(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" disabled={busy || !instruction.trim()} onClick={() => run()}>
            {busy ? <Spinner animation="border" size="sm" /> : <BsStars />} {busy ? a("working") : a("run")}
          </Button>
        </div>
      </div>

      {draft && (
        <div className="inv-ai__draft">
          <div className="inv-ai__meta">
            <div>
              <span>{a("issuer")}</span>
              <strong>{draft.lessor ? draft.lessor.name : a("noLessor")}</strong>
              {draft.lessor && <em>{a("portal", { portal: draft.lessor.portal })}</em>}
            </div>
            <div>
              <span>{a("buyer")}</span>
              <strong>{draft.billTo.title || "—"}</strong>
              <em>
                {[draft.billTo.taxNo && `${draft.billTo.taxNoLabel} ${draft.billTo.taxNo}`, draft.billTo.taxOffice && vd(draft.billTo.taxOffice)]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </em>
            </div>
            <div>
              <span>{a("period")}</span>
              <strong>{draft.periodFrom ? `${trDate(draft.periodFrom)} – ${trDate(draft.periodTo)}` : "—"}</strong>
            </div>
          </div>

          {draft.lines.length > 0 ? (
            <Table size="sm" className="contract-page__inv-table inv-ai__lines mb-0">
              <thead>
                <tr>
                  <th>{a("colDesc")}</th>
                  <th className="text-end">{a("colQty")}</th>
                  <th className="text-end">{a("colUnitPrice")}</th>
                  <th className="text-end">{a("colNet")}</th>
                </tr>
              </thead>
              <tbody>
                {draft.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.description}</td>
                    <td className="text-end">
                      {l.quantity} {l.unit}
                    </td>
                    <td className="text-end">{money(l.unitPriceNet)} TL</td>
                    <td className="text-end">{money(l.netAmount)} TL</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="inv-ai__empty">{a("noLines")}</p>
          )}

          {draft.lines.length > 0 && (
            <div className="contract-page__inv-preview inv-ai__totals">
              <span>
                {a("net")}: <strong>{money(draft.netTotal)} TL</strong>
              </span>
              <span>
                KDV %{draft.vatRate}: <strong>{money(draft.taxTotal)} TL</strong>
              </span>
              <span>
                {a("gross")}: <strong>{money(draft.grossTotal)} TL</strong>
              </span>
            </div>
          )}

          {draft.explanation && <p className="inv-ai__explain">{draft.explanation}</p>}
          {draft.warnings.length > 0 && (
            <ul className="inv-ai__warnings">
              {draft.warnings.map((w) => (
                <li key={w}>
                  <BsExclamationTriangleFill /> {w}
                </li>
              ))}
            </ul>
          )}

          <div className="contract-page__inv-actions">
            <Button type="button" variant="outline-secondary" size="sm" disabled={!draft.lines.length} onClick={copyLines}>
              {a("copy")}
            </Button>
            <Button type="button" size="sm" disabled={!draft.lines.length} onClick={() => onApply(draft)}>
              {a("apply")}
            </Button>
          </div>
          <p className="inv-ai__hint">{a("hint")}</p>
        </div>
      )}
    </div>
  );
};

export default InvoiceAiAssistant;
