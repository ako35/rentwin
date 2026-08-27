import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Container, Form } from "react-bootstrap";
import { FiSettings } from "react-icons/fi";
import { services } from "../../../services";
import { constants } from "../../../constants";
import "./filter-bar.scss";

const { routes } = constants;

const AdminFilterBar = ({ branchId, onBranchChange }) => {
  const { t } = useTranslation("admin");
  const [branches, setBranches] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    services.branch.getBranches().then(setBranches).catch(() => setBranches([]));
    services.announcement
      .getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  const announcementText = announcements.length
    ? announcements.map((item) => item.title).join("   •   ")
    : t("filterBar.noAnnouncements");

  return (
    <div className="admin-filter-bar">
      <Container fluid>
        <div className="admin-filter-bar__branch">
          <span>{t("filterBar.branch")}:</span>
          <Form.Select
            size="sm"
            value={branchId || ""}
            onChange={(e) => onBranchChange?.(e.target.value)}
          >
            <option value="">{t("filterBar.allBranches")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="admin-filter-bar__announcements">
          <span>{t("filterBar.announcements")}</span>
          <div className="admin-filter-bar__ticker">
            <span>{announcementText}</span>
          </div>
          <Link to={routes.adminAnnouncements}>{t("filterBar.allAnnouncements")}</Link>
          <Link to={routes.adminAnnouncements} title={t("filterBar.manageAnnouncements")} className="admin-filter-bar__settings">
            <FiSettings />
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default AdminFilterBar;
