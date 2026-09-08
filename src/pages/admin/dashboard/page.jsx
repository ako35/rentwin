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

const AdminDashboard = () => {
  const { t } = useTranslation("admin");
  const { branchId } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [fleetStats, setFleetStats] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState(null);
  const [hgsPending, setHgsPending] = useState([]);

  const loadData = async () => {
    try {
      const [stats, alerts, hgs] = await Promise.all([
        services.vehicle.getFleetStats(branchId),
        services.vehicle.getExpiryAlerts(branchId),
        services.contract.getHgsPendingContracts({ branchId }).catch(() => []),
      ]);
      setFleetStats(stats);
      setExpiryAlerts(alerts);
      setHgsPending(Array.isArray(hgs) ? hgs : []);
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

  return (
    <Container fluid className="admin-dashboard">
      {loading ? (
        <Loading height={500} />
      ) : (
        <>
          <Row className="gy-2 align-items-stretch">
            <Col xl={5}>
              <VehicleStatsPanel stats={fleetStats} />
            </Col>
            <Col xl={7}>
              <div className="admin-dashboard__gauges">
                <GaugeChart
                  value={fleetStats?.occupancyRate}
                  label={t("dashboard.occupancy")}
                  color="#3eb846"
                />
                <GaugeChart
                  value={fleetStats?.outOfServiceRate}
                  label={t("dashboard.outOfService")}
                  color="#b93a3a"
                />
              </div>
            </Col>
          </Row>

          <MaintenanceAlertBar alerts={expiryAlerts} hgsPending={hgsPending} />

          <Row className="gy-2">
            <Col xl={6}>
              <ScheduleTable title={t("dashboard.returns")} type="returns" dateField="dropOffTime" branchId={branchId} />
            </Col>
            <Col xl={6}>
              <ScheduleTable
                title={t("dashboard.departures")}
                type="departures"
                dateField="pickUpTime"
                branchId={branchId}
                source="reservation"
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default AdminDashboard;
