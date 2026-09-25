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
  const [invoicePending, setInvoicePending] = useState([]);
  const [kbsPending, setKbsPending] = useState([]);
  const [kbsReleasePending, setKbsReleasePending] = useState([]);
  const [signPending, setSignPending] = useState([]);

  const loadData = async () => {
    try {
      const [stats, alerts, hgs, invoices, kbs, kbsRelease, sign] = await Promise.all([
        services.vehicle.getFleetStats(branchId),
        services.vehicle.getExpiryAlerts(branchId),
        services.contract.getHgsPendingContracts({ branchId }).catch(() => []),
        services.contract.getInvoicePendingContracts({ branchId }).catch(() => []),
        services.contract.getKbsPendingContracts({ branchId }).catch(() => []),
        services.contract.getKbsReleasePendingContracts({ branchId }).catch(() => []),
        services.contract.getSignPendingContracts({ branchId }).catch(() => []),
      ]);
      setFleetStats(stats);
      setExpiryAlerts(alerts);
      setHgsPending(Array.isArray(hgs) ? hgs : []);
      setInvoicePending(Array.isArray(invoices) ? invoices : []);
      setKbsPending(Array.isArray(kbs) ? kbs : []);
      setKbsReleasePending(Array.isArray(kbsRelease) ? kbsRelease : []);
      setSignPending(Array.isArray(sign) ? sign : []);
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

          <MaintenanceAlertBar
            alerts={expiryAlerts}
            hgsPending={hgsPending}
            invoicePending={invoicePending}
            kbsPending={kbsPending}
            kbsReleasePending={kbsReleasePending}
            signPending={signPending}
          />

          <Row className="gy-2">
            <Col xl={6}>
              <ScheduleTable
                title={t("dashboard.returns")}
                type="returns"
                dateField="dropOffTime"
                branchId={branchId}
                defaultWindow="3"
              />
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
