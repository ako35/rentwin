import { useEffect, useState } from "react";
import { constants } from "../../../constants";
import { services } from "../../../services";
import { IoIosPeople } from "react-icons/io";
import { MdBookOnline } from "react-icons/md";
import { Col, Container, Row } from "react-bootstrap";
import {
  DashboardCard,
  GaugeChart,
  Loading,
  ScheduleTable,
  VehicleStatsPanel,
} from "../../../components";
import "./style.scss";

const { routes } = constants;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [fleetStats, setFleetStats] = useState(null);
  const [members, setMembers] = useState(null);
  const [reservations, setReservations] = useState(null);

  const loadData = async () => {
    try {
      const [userData, reservationsData, stats] = await Promise.all([
        services.user.getUsersByPage(0),
        services.reservation.getReservationsByPage(0),
        services.vehicle.getFleetStats(),
      ]);

      setMembers(userData?.totalElements);
      setReservations(reservationsData?.totalElements);
      setFleetStats(stats);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summaryItems = [
    {
      title: "Members",
      icon: <IoIosPeople />,
      path: routes.adminUsers,
      statistics: members,
    },
    {
      title: "Reservations",
      icon: <MdBookOnline />,
      path: routes.adminReservations,
      statistics: reservations,
    },
  ];

  return (
    <Container className="admin-dashboard">
      {loading ? (
        <Loading height={500} />
      ) : (
        <>
          <Row xxl={2} className="gy-3">
            {summaryItems.map((item, index) => (
              <Col key={index}>
                <DashboardCard {...item} />
              </Col>
            ))}
          </Row>

          <Row className="gy-3 mt-1 align-items-stretch">
            <Col xl={5}>
              <VehicleStatsPanel stats={fleetStats} />
            </Col>
            <Col xl={7}>
              <div className="admin-dashboard__gauges">
                <GaugeChart
                  value={fleetStats?.occupancyRate}
                  label="Occupancy"
                  color="#1b7a43"
                />
                <GaugeChart
                  value={fleetStats?.outOfServiceRate}
                  label="Out of Service"
                  color="#b93a3a"
                />
              </div>
            </Col>
          </Row>

          <Row className="gy-3 mt-1">
            <Col xl={6}>
              <ScheduleTable title="Returns" type="returns" dateField="dropOffTime" />
            </Col>
            <Col xl={6}>
              <ScheduleTable title="Departures" type="departures" dateField="pickUpTime" />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default AdminDashboard;
