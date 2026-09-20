import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Form, Spinner } from "react-bootstrap";
import { BsCircleHalf, BsSun, BsMoonStars, BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { useAdminTheme } from "../../../hooks/use-admin-theme";
import "./style.scss";

const EMPTY_ADMIN = { firstName: "", lastName: "", email: "", phoneNumber: "", password: "" };

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
  const { user: currentUser } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(toForm(null));

  const [kabisSystems, setKabisSystems] = useState([]);
  const [kabisName, setKabisName] = useState("");
  const [kabisAdding, setKabisAdding] = useState(false);
  const [kabisRemovingId, setKabisRemovingId] = useState(null);

  const [admins, setAdmins] = useState([]);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [adminAdding, setAdminAdding] = useState(false);
  const [adminRemovingId, setAdminRemovingId] = useState(null);

  const loadKabisSystems = () =>
    services.kabisSystem
      .getKabisSystems()
      .then(setKabisSystems)
      .catch(() => {});

  const loadAdmins = () =>
    services.user
      .getUsersByPage(0, 100, "firstName", "ASC", { role: "Administrator" })
      .then((list) => setAdmins(list?.content || []))
      .catch(() => {});

  useEffect(() => {
    Promise.all([
      services.settings.getSettings().then((data) => setForm(toForm(data))).catch(() => {}),
      loadKabisSystems(),
      loadAdmins(),
    ]).finally(() => setLoading(false));
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

  const addKabisSystem = async () => {
    const name = kabisName.trim();
    if (!name) return;
    setKabisAdding(true);
    try {
      await services.kabisSystem.addKabisSystem({ name });
      setKabisName("");
      await loadKabisSystems();
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.data?.code === "KABIS_SYSTEM_NAME_TAKEN"
          ? c("kabisSystems.duplicate")
          : c("kabisSystems.addError"),
        "error"
      );
    } finally {
      setKabisAdding(false);
    }
  };

  const removeKabisSystem = (system) => {
    utils.functions
      .swalQuestion(c("kabisSystems.deleteConfirmTitle"), "", { danger: true })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setKabisRemovingId(system.id);
        try {
          await services.kabisSystem.deleteKabisSystem(system.id);
          await loadKabisSystems();
        } catch {
          utils.functions.swalToast(c("kabisSystems.deleteError"), "error");
        } finally {
          setKabisRemovingId(null);
        }
      });
  };

  const setAdminField = (name) => (e) => setAdminForm((f) => ({ ...f, [name]: e.target.value }));
  const adminFormValid =
    adminForm.firstName.trim() && adminForm.lastName.trim() && adminForm.email.trim() && adminForm.password.length >= 8;

  const addAdmin = async () => {
    if (!adminFormValid) return;
    setAdminAdding(true);
    try {
      await services.user.createUserAdmin({
        firstName: adminForm.firstName.trim(),
        lastName: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        phoneNumber: adminForm.phoneNumber.trim(),
        password: adminForm.password,
        roles: ["Administrator"],
      });
      setAdminForm(EMPTY_ADMIN);
      await loadAdmins();
      utils.functions.swalToast(c("admins.addSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409 ? c("admins.emailExists") : c("admins.addError"),
        "error"
      );
    } finally {
      setAdminAdding(false);
    }
  };

  const removeAdmin = (admin) => {
    utils.functions
      .swalQuestion(c("admins.deleteConfirmTitle"), c("admins.deleteConfirmText", { name: `${admin.firstName} ${admin.lastName}` }), { danger: true })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        setAdminRemovingId(admin.id);
        try {
          await services.user.deleteUser(admin.id);
          await loadAdmins();
        } catch {
          utils.functions.swalToast(c("admins.deleteError"), "error");
        } finally {
          setAdminRemovingId(null);
        }
      });
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
      </section>

      <section className="admin-settings__card">
        <div className="admin-settings__card-head">
          <h3>{c("kabisSystems.title")}</h3>
          <p>{c("kabisSystems.hint")}</p>
        </div>

        <div className="admin-settings__list-actions">
          <Form.Control
            type="text"
            value={kabisName}
            placeholder={c("kabisSystems.namePlaceholder")}
            onChange={(e) => setKabisName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !kabisAdding) {
                e.preventDefault();
                addKabisSystem();
              }
            }}
          />
          <Button type="button" size="sm" disabled={kabisAdding || !kabisName.trim()} onClick={addKabisSystem}>
            {kabisAdding && <Spinner animation="border" size="sm" />} {c("kabisSystems.add")}
          </Button>
        </div>

        {kabisSystems.length === 0 ? (
          <p className="admin-settings__list-empty">{c("kabisSystems.empty")}</p>
        ) : (
          <ul className="admin-settings__list">
            {kabisSystems.map((system) => (
              <li key={system.id}>
                <span>{system.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline-danger"
                  disabled={kabisRemovingId === system.id}
                  onClick={() => removeKabisSystem(system)}
                  title={c("kabisSystems.delete")}
                >
                  {kabisRemovingId === system.id ? <Spinner animation="border" size="sm" /> : <BsTrash />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-settings__card">
        <div className="admin-settings__card-head">
          <h3>{c("admins.title")}</h3>
          <p>{c("admins.hint")}</p>
        </div>

        <div
          className="admin-settings__grid"
          onKeyDown={(e) => {
            if (e.key === "Enter" && adminFormValid && !adminAdding) {
              e.preventDefault();
              addAdmin();
            }
          }}
        >
          <Form.Group className="admin-settings__field">
            <Form.Label>{c("admins.firstName")}</Form.Label>
            <Form.Control type="text" value={adminForm.firstName} onChange={setAdminField("firstName")} />
          </Form.Group>
          <Form.Group className="admin-settings__field">
            <Form.Label>{c("admins.lastName")}</Form.Label>
            <Form.Control type="text" value={adminForm.lastName} onChange={setAdminField("lastName")} />
          </Form.Group>
          <Form.Group className="admin-settings__field">
            <Form.Label>{c("admins.email")}</Form.Label>
            <Form.Control type="email" value={adminForm.email} onChange={setAdminField("email")} />
          </Form.Group>
          <Form.Group className="admin-settings__field">
            <Form.Label>{c("admins.phoneNumber")}</Form.Label>
            <Form.Control type="text" value={adminForm.phoneNumber} onChange={setAdminField("phoneNumber")} />
          </Form.Group>
          <Form.Group className="admin-settings__field">
            <Form.Label>{c("admins.password")}</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={adminForm.password}
              onChange={setAdminField("password")}
              placeholder={c("admins.passwordPlaceholder")}
            />
          </Form.Group>
        </div>

        <div className="admin-settings__list-actions">
          <Button type="button" size="sm" disabled={adminAdding || !adminFormValid} onClick={addAdmin}>
            {adminAdding && <Spinner animation="border" size="sm" />} {c("admins.add")}
          </Button>
        </div>

        {admins.length === 0 ? (
          <p className="admin-settings__list-empty">{c("admins.empty")}</p>
        ) : (
          <ul className="admin-settings__list">
            {admins.map((admin) => {
              const isSelf = admin.id === currentUser?.id;
              const locked = admin.builtIn || isSelf;
              return (
                <li key={admin.id}>
                  <span>
                    {admin.firstName} {admin.lastName}
                    <span className="admin-settings__list-sub"> · {admin.email}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline-danger"
                    disabled={locked || adminRemovingId === admin.id}
                    onClick={() => removeAdmin(admin)}
                    title={isSelf ? c("admins.cannotDeleteSelf") : c("admins.delete")}
                  >
                    {adminRemovingId === admin.id ? <Spinner animation="border" size="sm" /> : <BsTrash />}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="admin-settings__actions">
        <Button type="button" disabled={saving} onClick={save}>
          {saving && <Spinner animation="border" size="sm" />} {c("save")}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
