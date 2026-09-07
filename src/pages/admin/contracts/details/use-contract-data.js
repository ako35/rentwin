import { useEffect, useState } from "react";
import moment from "moment/moment";
import { services } from "../../../../services";
import { EMPTY_CONTRACT, fetchCustomers, contractToFormValues } from "./contract-helpers";

// Owns every piece of data the contract screen loads — reference lists
// (vehicles / locations), the customer list, and, in edit mode, the reservation
// itself plus its payments / extensions / invoice.
export const useContractData = ({ isCreate, contractId }) => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [meta, setMeta] = useState({});
  const [initialValues, setInitialValues] = useState(EMPTY_CONTRACT);
  const [availableCars, setAvailableCars] = useState([]);
  const [payments, setPayments] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [vehicleChanges, setVehicleChanges] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const loadPayments = () =>
    services.contract
      .getRecords(contractId, "payments")
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]));

  const loadInvoices = () =>
    services.contract
      .getInvoices(contractId)
      .then((d) => setInvoices(Array.isArray(d) ? d : []))
      .catch(() => setInvoices([]));

  // Refresh only the customer block (its cari balance moves when a payment is
  // recorded) without reloading the contract into the form and losing edits.
  const refreshCustomer = () =>
    services.contract
      .getContractByIdAdmin(contractId)
      .then((r) => setCustomer(r.customer || null))
      .catch(() => {});

  const refreshCustomers = () => fetchCustomers().then(setCustomers).catch(() => {});

  const loadRefData = async () => {
    const [v, loc] = await Promise.all([
      services.vehicle.getVehicles(),
      services.location.getLocations().catch(() => []),
    ]);
    setVehicles(v || []);
    setLocations(loc || []);
  };

  const loadCreate = async () => {
    try {
      await loadRefData();
      setCustomers(await fetchCustomers().catch(() => []));
      setInitialValues({
        ...EMPTY_CONTRACT,
        status: "CREATED",
        pickUpDate: moment().format("YYYY-MM-DD"),
        pickUpTime: "10:00",
        dropOffDate: moment().add(3, "days").format("YYYY-MM-DD"),
        dropOffTime: "10:00",
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (isCreate) return loadCreate();
    try {
      await loadRefData();
      const r = await services.contract.getContractByIdAdmin(contractId);
      setExtensions(r.extensions || []);
      setVehicleChanges(r.vehicleChanges || []);
      setInvoices(r.invoices || []);
      loadPayments();
      setCustomer(r.customer || null);
      setMeta({ createdAt: r.createdAt, updatedAt: r.updatedAt });
      setInitialValues(contractToFormValues(r));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A customer added in another tab shows up when the user returns here.
  useEffect(() => {
    if (!isCreate) return undefined;
    const onFocus = () => refreshCustomers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isCreate]);

  return {
    loading,
    vehicles, locations, customers, customer, meta,
    initialValues, availableCars, payments, extensions, vehicleChanges, invoices,
    setCustomers, setAvailableCars, setInvoices,
    loadData, loadPayments, loadInvoices, refreshCustomer, refreshCustomers,
  };
};
