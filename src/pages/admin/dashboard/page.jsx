import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { services } from "../../../services";
import { Col, Container, Row } from "react-bootstrap";
import {
  GaugeChart,
  Loading,
  MaintenanceAlertBar,
  ScheduleTable,
  VehicleStatsPanel,
} from "../../../components";
import "./style.scss";

const AUTO_REFRESH_INTERVAL_MS = 60000;

const AdminDashboard = () => {
  const { t } = useTranslation("admin");
  const { branchId } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [fleetStats, setFleetStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = async () => {
    try {
      const stats = await services.vehicle.getFleetStats(branchId);
      setFleetStats(stats);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(loadData, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, branchId]);

  return (
    <Container fluid className="admin-dashboard">
      {loading ? (
        <Loading height={500} />
      ) : (
        <>
          <Row className="gy-3 align-items-stretch">
            <Col xl={5}>
              <VehicleStatsPanel stats={fleetStats} />
            </Col>
            <Col xl={7}>
              <div className="admin-dashboard__gauges">
                <GaugeChart
                  value={fleetStats?.occupancyRate}
                  label={t("dashboard.occupancy")}
                  color="#1b7a43"
                />
                <GaugeChart
                  value={fleetStats?.outOfServiceRate}
                  label={t("dashboard.outOfService")}
                  color="#b93a3a"
                />
              </div>
            </Col>
          </Row>

          <MaintenanceAlertBar
            maintenanceDue={fleetStats?.maintenanceDue}
            inspectionDue={fleetStats?.inspectionDue}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
          />

          <Row className="gy-3 mt-1">
            <Col xl={6}>
              <ScheduleTable title={t("dashboard.returns")} type="returns" dateField="dropOffTime" branchId={branchId} />
            </Col>
            <Col xl={6}>
              <ScheduleTable title={t("dashboard.departures")} type="departures" dateField="pickUpTime" branchId={branchId} />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default AdminDashboard;
