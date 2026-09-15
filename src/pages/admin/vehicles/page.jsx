import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { constants } from "../../../constants";
import { Link, useNavigate } from "react-router-dom";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { Button, ButtonGroup, Form, Spinner } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { Loading } from "../../../components";
import '../contracts/style.scss'
import './style.scss'

const { routes } = constants;
const EMPTY_FILTERS = { brand: "", model: "", branchId: "", transmission: "", fuelType: "", status: "" };
const STATUS_VALUES = ["AVAILABLE", "RENTED", "OUT_OF_SERVICE"];

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
  const [perPage, setPerPage] = useState(10);
  const [resetPage, setResetPage] = useState(false);
  const navigate = useNavigate();

  // Draft values the selects are bound to vs. the filters actually applied
  // to the query — mirrors the reservations/contracts list pattern so
  // picking a brand doesn't refetch until "Filtrele" is clicked.
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    services.vehicle
      .listModelImages()
      .then((rows) => {
        setBrandOptions([...new Set(rows.map((r) => r.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")));
        setModelOptions([...new Set(rows.map((r) => r.model).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")));
      })
      .catch(() => {});
    services.branch.getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  const loadData = async (page, size = perPage, sold = showSold, filters = appliedFilters) => {
    setLoading(true);
    try {
      const vehicleData = await services.vehicle.getVehiclesByPageAdmin(
        page,
        size,
        "id",
        "DESC",
        sold,
        filters
      );
      setVehicles(vehicleData.content);
      setTotalRows(vehicleData.totalElements);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (sold) => {
    if (sold === showSold) return;
    setShowSold(sold);
    setResetPage((prev) => !prev);
    // Durum (AVAILABLE/RENTED/OUT_OF_SERVICE) is meaningless once every row
    // is SOLD — drop it so switching to Satılanlar doesn't silently show an
    // empty list because of a filter that no longer applies.
    const nextFilters = sold && appliedFilters.status ? { ...appliedFilters, status: "" } : appliedFilters;
    if (nextFilters !== appliedFilters) {
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    }
    loadData(0, perPage, sold, nextFilters);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setResetPage((prev) => !prev);
    loadData(0, perPage, showSold, draftFilters);
  };

  const clearFilters = () => {
    if (draftFilters === EMPTY_FILTERS && appliedFilters === EMPTY_FILTERS) return;
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setResetPage((prev) => !prev);
    loadData(0, perPage, showSold, EMPTY_FILTERS);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

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

      <div className="contract-list__filters admin-vehicle-page__filters">
        <Form.Select
          size="sm"
          value={draftFilters.brand}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, brand: e.target.value }))}
        >
          <option value="">{f("allBrands")}</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Form.Select>
        <Form.Select
          size="sm"
          value={draftFilters.model}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, model: e.target.value }))}
        >
          <option value="">{f("allModels")}</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Form.Select>
        <Form.Select
          size="sm"
          value={draftFilters.branchId}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, branchId: e.target.value }))}
        >
          <option value="">{f("allBranches")}</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </Form.Select>
        <Form.Select
          size="sm"
          value={draftFilters.transmission}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, transmission: e.target.value }))}
        >
          <option value="">{f("allTransmissions")}</option>
          {constants.transmissionTypes.map((tt) => (
            <option key={tt.value} value={tt.value}>{tCommon(`options.transmissionTypes.${tt.value}`)}</option>
          ))}
        </Form.Select>
        <Form.Select
          size="sm"
          value={draftFilters.fuelType}
          onChange={(e) => setDraftFilters((prev) => ({ ...prev, fuelType: e.target.value }))}
        >
          <option value="">{f("allFuels")}</option>
          {constants.fuelTypes.map((ft) => (
            <option key={ft.value} value={ft.value}>{tCommon(`options.fuelTypes.${ft.value}`)}</option>
          ))}
        </Form.Select>
        {!showSold && (
          <Form.Select
            size="sm"
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">{f("allStatuses")}</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>{t(`vehicleStatus.${s}`)}</option>
            ))}
          </Form.Select>
        )}
        <Button size="sm" variant="secondary" onClick={applyFilters}>{f("apply")}</Button>
        {hasActiveFilters && (
          <Button size="sm" variant="outline-secondary" onClick={clearFilters}>{f("clear")}</Button>
        )}
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
