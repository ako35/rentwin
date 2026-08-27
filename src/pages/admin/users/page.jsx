import { useState } from "react";
import { constants } from "../../../constants";
import { Button, Spinner } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { utils } from "../../../utils";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { services } from "../../../services";
import { Loading } from "../../../components";
import { useNavigate } from "react-router-dom";
import "./style.scss";

const { routes } = constants;

const AdminUsersPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const columns = utils.tables.getAdminUserColumns(t, tCommon);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userData, setUserData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const navigate = useNavigate();

  const loadData = async (page) => {
    try {
      const data = await services.user.getUsersByPage(page, perPage);
      setUserData(data.content);
      setTotalRows(data.totalElements);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const download = await services.user.downloadUserReports();

      const url = window.URL.createObjectURL(download);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.xlsx";
      document.body.appendChild(link);
      link.click();
      utils.functions.swalToast(t("users.toasts.downloadSuccess"), "success");
      link.remove();
    } catch (error) {
      utils.functions.swalToast(
        t("users.toasts.downloadError"),
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePerPageRowsChange = async (newPerPage, page) => {
    try {
      const data = await services.user.getUsersByPage(page - 1, newPerPage);
      setUserData(data.content);
      setPerPage(newPerPage);
      setTotalRows(data.totalElements);
    } catch (error) {
      utils.functions.swalToast(
        t("users.toasts.pageChangeError"),
        "error"
      );
    }
  };

  const handlePageChange = (page) => {
    loadData(page - 1);
  };

  const handleRowClicked = (row) => {
    navigate(`${routes.adminUsers}/${row.id}`);
  };

  useEffect(() => {
    loadData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-users-page">
      <Button onClick={handleDownload} disabled={loading}>
        {downloading && <Spinner animation="border" size="sm" />} {t("users.downloadData")}
      </Button>
      <div className="admin-users-table-container">
        <DataTable
          title={t("users.tableTitle")}
          columns={columns}
          data={userData}
          progressPending={loading}
          progressComponent={<Loading height={500} />}
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerPageRowsChange}
          onChangePage={handlePageChange}
          paginationPerPage={perPage}
          onRowClicked={handleRowClicked}
          pagination
          paginationServer
          highlightOnHover
        />
      </div>
    </div>
  );
};

export default AdminUsersPage;
