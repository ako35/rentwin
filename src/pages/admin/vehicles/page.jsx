import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import { Link, useNavigate } from "react-router-dom";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Button, ButtonGroup, Spinner } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { Loading } from "../../../components";
import './style.scss'

const { routes } = constants;

const AdminVehiclesPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const columns = utils.tables.getAdminVehiclesColumns(t, tCommon);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const navigate = useNavigate();

  const loadData = async (page, size = perPage) => {
    try {
      const vehicleData = await services.vehicle.getVehiclesByPageAdmin(
        page,
        size
      );
      setVehicles(vehicleData.content);
      setTotalRows(vehicleData.totalElements);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const download = await services.vehicle.downloadVehicleReports();
      const url = window.URL.createObjectURL(download);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "vehicles.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      utils.functions.swalToast(
        t("vehicles.toasts.downloadSuccess"),
        "success"
      );
    } catch (error) {
      utils.functions.swalToast(
        t("vehicles.toasts.downloadError"),
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePerPageRowsChange = async (newPerPage, page) => {
    try {
      setPerPage(newPerPage);
      await loadData(page - 1, newPerPage);
    } catch (error) {
      utils.functions.swalToast(
        t("vehicles.toasts.pageChangeError"),
        "error"
      );
    }
  };

  const handlePageChange = (page) => {
    loadData(page - 1);
  };

  const handleRowClicked = (row) => {
    navigate(`${routes.adminVehicles}/${row.id}`);
  };

  useEffect(() => {
    loadData(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-vehicle-page">
      <ButtonGroup className="align-self-end">
        <Button as={Link} to={`${routes.adminVehicles}/new`}>
          {t("vehicles.newVehicle")}
        </Button>
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading && <Spinner animation="border" size="sm" />} {t("vehicles.downloadReports")}
        </Button>
      </ButtonGroup>
      <div className="admin-vehicle-table-container">
        <DataTable
          title={t("vehicles.tableTitle")}
          columns={columns}
          data={vehicles}
          progressPending={loading}
          progressComponent={<Loading height={500} />}
          paginationTotalRows={totalRows}
          paginationPerPage={perPage}
          onChangeRowsPerPage={handlePerPageRowsChange}
          onChangePage={handlePageChange}
          onRowClicked={handleRowClicked}
          pagination
          paginationServer
          highlightOnHover
          responsive
        />
      </div>
    </div>
  );
};

export default AdminVehiclesPage;
