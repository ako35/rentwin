import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Button, Form, InputGroup, Spinner } from "react-bootstrap";
import { BsCircleHalf, BsSun, BsMoonStars, BsTrash, BsPencil, BsPalette, BsCashCoin, BsShieldCheck, BsPeopleFill, BsBell } from "react-icons/bs";
import { MdOutlineVisibility, MdOutlineVisibilityOff } from "react-icons/md";
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

// Dashboard's "yaklaşan/süresi geçmiş" alert panel window, per category —
// blank falls back to the 15-day default (see vehicles.dashboard.controller.js).
const ALERT_WINDOW_DEFAULT_DAYS = "15";
const ALERT_FIELDS = [
  { name: "alertWindowInspectionDays" },
  { name: "alertWindowInsuranceDays" },
  { name: "alertWindowKaskoDays" },
  { name: "alertWindowTaxDays" },
];

// Left-nav sections — each maps 1:1 to a settings.<key>.title translation.
const SECTIONS = [
  { key: "appearance", icon: BsPalette },
  { key: "contractDefaults", icon: BsCashCoin },
  { key: "alertWindows", icon: BsBell },
  { key: "kabisSystems", icon: BsShieldCheck },
  { key: "admins", icon: BsPeopleFill },
];
const SECTION_KEYS = SECTIONS.map((s) => s.key);

const ALL_FORM_FIELDS = [...FIELDS, ...ALERT_FIELDS];
const toForm = (data) =>
  ALL_FORM_FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: data?.[f.name] == null ? "" : String(data[f.name]) }), {});

const AdminSettingsPage = () => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`settings.${key}`);
  const { choice, setChoice } = useAdminTheme();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = SECTION_KEYS.includes(requestedSection) ? requestedSection : "appearance";
  const goToSection = (key) => setSearchParams({ section: key });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(toForm(null));

  const [kabisSystems, setKabisSystems] = useState([]);
  const [kabisName, setKabisName] = useState("");
  const [kabisAdding, setKabisAdding] = useState(false);
  const [kabisRemovingId, setKabisRemovingId] = useState(null);

  const [admins, setAdmins] = useState([]);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [adminAdding, setAdminAdding] = useState(false);
  const [adminRemovingId, setAdminRemovingId] = useState(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

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
  const isEditingAdmin = editingAdminId != null;
  // Password is mandatory to create a login, but optional on edit — leaving
  // it blank keeps the account's current password.
  const adminFormValid =
    adminForm.firstName.trim() &&
    adminForm.lastName.trim() &&
    adminForm.email.trim() &&
    (isEditingAdmin ? adminForm.password.length === 0 || adminForm.password.length >= 8 : adminForm.password.length >= 8);

  const startEditAdmin = (admin) => {
    setEditingAdminId(admin.id);
    setAdminForm({
      firstName: admin.firstName || "",
      lastName: admin.lastName || "",
      email: admin.email || "",
      phoneNumber: admin.phoneNumber || "",
      password: "",
    });
    setShowAdminPassword(false);
  };

  const cancelEditAdmin = () => {
    setEditingAdminId(null);
    setAdminForm(EMPTY_ADMIN);
    setShowAdminPassword(false);
  };

  const saveAdmin = async () => {
    if (!adminFormValid) return;
    setAdminAdding(true);
    try {
      const payload = {
        firstName: adminForm.firstName.trim(),
        lastName: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        phoneNumber: adminForm.phoneNumber.trim(),
      };
      if (isEditingAdmin) {
        if (adminForm.password) payload.password = adminForm.password;
        await services.user.updateUserAdmin(editingAdminId, payload);
      } else {
        payload.password = adminForm.password;
        payload.roles = ["Administrator"];
        await services.user.createUserAdmin(payload);
      }
      setAdminForm(EMPTY_ADMIN);
      setEditingAdminId(null);
      setShowAdminPassword(false);
      await loadAdmins();
      utils.functions.swalToast(c(isEditingAdmin ? "admins.editSuccess" : "admins.addSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(
        error?.response?.status === 409
          ? c("admins.emailExists")
          : c(isEditingAdmin ? "admins.editError" : "admins.addError"),
        "error"
      );
    } finally {
      setAdminAdding(false);
    }
  };

  const removeAdmin = (admin) => {
    utils.functions
      .swalQuestion(
        c("admins.deleteConfirmTitle"),
        c("admins.deleteConfirmText", { name: `${admin.firstName} ${admin.lastName}` }),
        { danger: true }
      )
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

      <div className="admin-settings__body">
        <nav className="admin-settings__nav" aria-label={c("pageTitle")}>
          {SECTIONS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`admin-settings__nav-item${activeSection === key ? " is-active" : ""}`}
              onClick={() => goToSection(key)}
            >
              <Icon /> {c(`${key}.title`)}
            </button>
          ))}
        </nav>

        <div className="admin-settings__content">
          {activeSection === "appearance" && (
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
          )}

          {activeSection === "contractDefaults" && (
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
          )}

          {activeSection === "alertWindows" && (
            <section className="admin-settings__card">
              <div className="admin-settings__card-head">
                <h3>{c("alertWindows.title")}</h3>
                <p>{c("alertWindows.hint")}</p>
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
                {ALERT_FIELDS.map((f) => (
                  <Form.Group key={f.name} className="admin-settings__field">
                    <Form.Label>{c(`alertWindows.${f.name}`)}</Form.Label>
                    <div className="admin-settings__input">
                      <Form.Control
                        type="number"
                        min="1"
                        step="1"
                        value={form[f.name]}
                        onChange={setV(f.name)}
                        placeholder={ALERT_WINDOW_DEFAULT_DAYS}
                      />
                      <span>{c("alertWindows.suffix")}</span>
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
          )}

          {activeSection === "kabisSystems" && (
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
          )}

          {activeSection === "admins" && (
            <section className="admin-settings__card">
              <div className="admin-settings__card-head">
                <h3>{c("admins.title")}</h3>
                <p>{c(isEditingAdmin ? "admins.editHint" : "admins.hint")}</p>
              </div>

              <div
                className="admin-settings__grid"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adminFormValid && !adminAdding) {
                    e.preventDefault();
                    saveAdmin();
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
                  <InputGroup>
                    <Form.Control
                      type={showAdminPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={adminForm.password}
                      onChange={setAdminField("password")}
                      placeholder={c(isEditingAdmin ? "admins.passwordEditPlaceholder" : "admins.passwordPlaceholder")}
                    />
                    <InputGroup.Text
                      role="button"
                      style={{ cursor: "pointer" }}
                      onClick={() => setShowAdminPassword((v) => !v)}
                      title={c(showAdminPassword ? "admins.hidePassword" : "admins.showPassword")}
                    >
                      {showAdminPassword ? <MdOutlineVisibilityOff /> : <MdOutlineVisibility />}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </div>

              <div className="admin-settings__list-actions">
                <Button type="button" size="sm" disabled={adminAdding || !adminFormValid} onClick={saveAdmin}>
                  {adminAdding && <Spinner animation="border" size="sm" />} {c(isEditingAdmin ? "save" : "admins.add")}
                </Button>
                {isEditingAdmin && (
                  <Button type="button" size="sm" variant="outline-secondary" disabled={adminAdding} onClick={cancelEditAdmin}>
                    {c("admins.cancel")}
                  </Button>
                )}
              </div>

              {admins.length === 0 ? (
                <p className="admin-settings__list-empty">{c("admins.empty")}</p>
              ) : (
                <ul className="admin-settings__list">
                  {admins.map((admin) => {
                    const isSelf = admin.id === currentUser?.id;
                    const locked = admin.builtIn || isSelf;
                    return (
                      <li key={admin.id} className={editingAdminId === admin.id ? "is-editing" : ""}>
                        <span>
                          {admin.firstName} {admin.lastName}
                          <span className="admin-settings__list-sub"> · {admin.email}</span>
                          {admin.phoneNumber ? <span className="admin-settings__list-sub"> · {admin.phoneNumber}</span> : null}
                        </span>
                        <span className="admin-settings__list-actions-group">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-secondary"
                            disabled={admin.builtIn || adminAdding}
                            onClick={() => startEditAdmin(admin)}
                            title={admin.builtIn ? c("admins.cannotEditBuiltIn") : c("admins.edit")}
                          >
                            <BsPencil />
                          </Button>
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
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
