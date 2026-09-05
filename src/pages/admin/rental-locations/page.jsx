import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Form, Table } from "react-bootstrap";
import { BsTrash } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "./style.scss";

const AdminRentalLocationsPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef();
  const [searchParams, setSearchParams] = useSearchParams();

  const loadData = async () => {
    try {
      setLocations(await services.location.getLocations());
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      inputRef.current?.focus();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await services.location.addLocation({ name: name.trim() });
      utils.functions.swalToast(t("rentalLocations.toasts.createSuccess"), "success");
      setName("");
      loadData();
    } catch (error) {
      utils.functions.swalToast(t("rentalLocations.toasts.createError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (location) => {
    utils.functions
      .swalQuestion(t("rentalLocations.toasts.deleteConfirmTitle"), t("rentalLocations.toasts.deleteConfirmText"))
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.location.deleteLocation(location.id);
          utils.functions.swalToast(t("rentalLocations.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("rentalLocations.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-rental-locations-page">
      <div className="admin-rental-locations-page__toolbar">
        <h2>{t("rentalLocations.pageTitle")}</h2>
      </div>
      <p className="admin-rental-locations-page__hint">{t("rentalLocations.hint")}</p>

      <Form className="admin-rental-locations-page__form" onSubmit={handleAdd}>
        <Form.Control
          ref={inputRef}
          value={name}
          placeholder={t("rentalLocations.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={saving || !name.trim()}>{t("rentalLocations.add")}</Button>
      </Form>

      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive>
          <thead>
            <tr>
              <th>{t("rentalLocations.table.name")}</th>
              <th>{t("rentalLocations.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center">{t("rentalLocations.empty")}</td>
              </tr>
            )}
            {locations.map((location) => (
              <tr key={location.id}>
                <td>{location.name}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(location)}
                    title={t("rentalLocations.delete")}
                  >
                    <BsTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AdminRentalLocationsPage;
