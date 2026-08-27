import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Button, Spinner } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { Loading } from "../../../components";
import './style.scss';
import { constants } from "../../../constants";

const { routes } = constants;

const AdminReservationsPage = () => {
  const { t } = useTranslation("admin");
  const columns = utils.tables.getAdminReservationsColumns(t);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const navigate = useNavigate();

  const loadData = async (page) => {
    try {
      const data = await services.reservation.getReservationsByPage(
        page,
        perPage
      );
      setReservations(data.content);
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
      const download = await services.reservation.downloadReservationReports();

      const url = window.URL.createObjectURL(download);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.xlsx";
      document.body.appendChild(link);
      link.click();
      utils.functions.swalToast(t("reservations.toasts.downloadSuccess"), "success");
      link.remove();
    } catch (error) {
      utils.functions.swalToast(
        t("reservations.toasts.downloadError"),
        "error"
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePerPageRowsChange = async (newPerPage, page) => {
    try {
      const data = await services.reservation.getReservationsByPage(
        page - 1,
        newPerPage
      );
      setReservations(data.content);
      setPerPage(newPerPage);
      setTotalRows(data.totalElements);
    } catch (error) {
      utils.functions.swalToast(
        t("reservations.toasts.pageChangeError"),
        "error"
      );
    }
  };

  const handlePageChange = (page) => {
    loadData(page - 1);
  };

  const handleRowClicked = (row) => {
    navigate(`${routes.adminReservations}/${row.id}`);
  };

  // useEffect(() => {
  //   loadData(0);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  return (
    <div className="admin-reservations-page">
      <Button onClick={handleDownload} disabled={loading}>
        {downloading && <Spinner animation="border" size="sm" />} {t("reservations.downloadData")}
      </Button>
      <div className="admin-reservations-table-container">
        <DataTable
          title={t("reservations.tableTitle")}
          columns={columns}
          data={reservations}
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

export default AdminReservationsPage;
