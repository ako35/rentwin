import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { BsCircleHalf, BsSun, BsMoonStars } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { useAdminTheme } from "../../../hooks/use-admin-theme";
import "./style.scss";

const THEME_OPTIONS = [
  { value: "system", icon: BsCircleHalf },
  { value: "light", icon: BsSun },
  { value: "dark", icon: BsMoonStars },
];

const FIELDS = [
  { name: "defaultDailyKmLimit", suffix: "km/gün", type: "int" },
  { name: "defaultMonthlyKmLimit", suffix: "km/ay", type: "int" },
  { name: "defaultKmOverageFee", suffix: "₺/km", type: "money" },
  { name: "defaultFuelFeePerEighth", suffix: "₺ / (1/8)", type: "money" },
];

const toForm = (data) =>
  FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: data?.[f.name] == null ? "" : String(data[f.name]) }), {});

const AdminSettingsPage = () => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`settings.${key}`);
  const { choice, setChoice } = useAdminTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(toForm(null));

  useEffect(() => {
    services.settings
      .getSettings()
      .then((data) => setForm(toForm(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setV = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await services.settings.updateSettings(form);
      setForm(toForm(saved));
      utils.functions.swalToast(c("saveSuccess"), "success");
    } catch {
      utils.functions.swalToast(c("saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading height={320} />;

  return (
    <div className="admin-settings">
      <header className="admin-settings__head">
        <h2>{c("pageTitle")}</h2>
      </header>

      <section className="admin-settings__card">
        <div className="admin-settings__card-head">
          <h3>{c("appearance.title")}</h3>
          <p>{c("appearance.hint")}</p>
        </div>

        <div className="admin-settings__theme" role="group" aria-label={c("appearance.title")}>
          {THEME_OPTIONS.map(({ value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`admin-settings__theme-option${choice === value ? " is-active" : ""}`}
              aria-pressed={choice === value}
              onClick={() => setChoice(value)}
            >
              <Icon />
              {c(`appearance.${value}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-settings__card">
        <div className="admin-settings__card-head">
          <h3>{c("contractDefaults.title")}</h3>
          <p>{c("contractDefaults.hint")}</p>
        </div>

        <div
          className="admin-settings__grid"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !saving) {
              e.preventDefault();
              save();
            }
          }}
        >
          {FIELDS.map((f) => (
            <Form.Group key={f.name} className="admin-settings__field">
              <Form.Label>{c(`contractDefaults.${f.name}`)}</Form.Label>
              <div className="admin-settings__input">
                <Form.Control
                  type="number"
                  min="0"
                  step={f.type === "money" ? "0.01" : "1"}
                  value={form[f.name]}
                  onChange={setV(f.name)}
                  placeholder={c("empty")}
                />
                <span>{f.suffix}</span>
              </div>
            </Form.Group>
          ))}
        </div>

        <div className="admin-settings__actions">
          <Button type="button" disabled={saving} onClick={save}>
            {saving && <Spinner animation="border" size="sm" />} {c("save")}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AdminSettingsPage;
