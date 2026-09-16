import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import { Link, useNavigate } from "react-router-dom";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Button, ButtonGroup, Spinner } from "react-bootstrap";
import { BsSearch, BsXLg } from "react-icons/bs";
import DataTable from "react-data-table-component";
import { Loading } from "../../../components";
import './style.scss'

const { routes } = constants;

const AdminVehiclesPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const f = (key) => t(`vehicleFilters.${key}`);
  const [showSold, setShowSold] = useState(false);
  const columns = utils.tables.getAdminVehiclesColumns(t, tCommon, showSold);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(15);
  const [resetPage, setResetPage] = useState(false);
  const navigate = useNavigate();

  // One free-text box replaces the old brand/model/branch/transmission/fuel/
  // status dropdown row — the backend matches every word against all of
  // those at once. Live-searches (debounced) instead of needing an "Apply"
  // click, matching a normal search-box feel.
  const [search, setSearch] = useState("");
  const isFirstSearch = useRef(true);
  // Live search means two fetches can be in flight at once (type fast enough
  // and the previous debounced request hasn't resolved yet) — without this,
  // an older request resolving after a newer one can overwrite fresh results
  // with stale ones. Only the response matching the latest request wins.
  const requestId = useRef(0);

  const loadData = async (page, size = perPage, sold = showSold, query = search) => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    try {
      const vehicleData = await services.vehicle.getVehiclesByPageAdmin(
        page,
        size,
        "id",
        "DESC",
        sold,
        query.trim()
      );
      if (thisRequest !== requestId.current) return;
      setVehicles(vehicleData.content);
      setTotalRows(vehicleData.totalElements);
    } catch (error) {
      console.log(error);
    } finally {
      if (thisRequest === requestId.current) setLoading(false);
    }
  };

  const switchView = (sold) => {
    if (sold === showSold) return;
    setShowSold(sold);
    setResetPage((prev) => !prev);
    loadData(0, perPage, sold);
  };

  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    const handle = setTimeout(() => {
      setResetPage((prev) => !prev);
      loadData(0, perPage, showSold, search);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
      <div className="admin-vehicle-page__toolbar">
        <div className="admin-vehicle-page__view-toggle">
          <button
            type="button"
            className={showSold ? "" : "is-active"}
            onClick={() => switchView(false)}
          >
            {t("vehicles.filterActive")}
          </button>
          <button
            type="button"
            className={showSold ? "is-active" : ""}
            onClick={() => switchView(true)}
          >
            {t("vehicles.filterSold")}
          </button>
        </div>

        <div className="admin-vehicle-page__search">
          <BsSearch className="admin-vehicle-page__search-icon" />
          <input
            type="text"
            placeholder={f("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="admin-vehicle-page__search-clear"
              onClick={() => setSearch("")}
              aria-label={f("clear")}
            >
              <BsXLg />
            </button>
          )}
        </div>
      </div>

      <div className="admin-vehicle-table-container">
        <DataTable
          title={showSold ? t("vehicles.soldTableTitle") : t("vehicles.tableTitle")}
          columns={columns}
          data={vehicles}
          progressPending={loading}
          progressComponent={<Loading height={500} />}
          paginationTotalRows={totalRows}
          paginationPerPage={perPage}
          paginationResetDefaultPage={resetPage}
          onChangeRowsPerPage={handlePerPageRowsChange}
          onChangePage={handlePageChange}
          onRowClicked={handleRowClicked}
          customStyles={utils.tables.dataTableStyles}
          pagination
          paginationServer
          highlightOnHover
          responsive
          dense
        />
      </div>
    </div>
  );
};

export default AdminVehiclesPage;
