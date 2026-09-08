import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Nav } from "react-bootstrap";
import moment from "moment/moment";
import CustomerPanel from "./CustomerPanel";
import CustomerSummary from "./CustomerSummary";
import InvoiceTab from "./InvoiceTab";
import SummaryTab from "./SummaryTab";
import PaymentsTab from "./PaymentsTab";
import ReturnExtraTab from "./ReturnExtraTab";
import ExtensionTab from "./ExtensionTab";
import VehicleChangeTab from "./VehicleChangeTab";
import PricingBlock from "./PricingBlock";
import "./right-card.scss";

const SUB_TABS = ["summary", "payments", "returnExtra", "extension", "vehicleChange"];

// A titled, bordered section of the right column. Defined at module scope so its
// identity is stable across re-renders.
const Panel = ({ title, children, className = "" }) => (
  <div className={`contract-page__panel ${className}`.trim()}>
    {title && <div className="contract-page__panel-head">{title}</div>}
    <div className="contract-page__panel-body">{children}</div>
  </div>
);

// The right column of the contract screen, split into clearly separated panels:
// the party (customer / invoice), the contract-action sub tabs (summary /
// payments / return-extra / extension / vehicle-change), and the price summary.
const ContractRightCard = ({
  isCreate, contractId, formik, navKey,
  customers, customer, invoices, periods, vehicleChanges,
  refreshCustomers, onRequestNewCustomer, onInvoicesChange, loadData, loadPayments,
  selectedCar, billableDays, pricing, collected,
  recordLabels, money,
}) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const [topTab, setTopTab] = useState("customer");
  const [subTab, setSubTab] = useState("summary");

  return (
    <section className="contract-card contract-card--right">
      <Panel title={c("panels.party")}>
        <Nav variant="tabs" activeKey={topTab} onSelect={(k) => k && setTopTab(k)} className="mb-3">
          <Nav.Item><Nav.Link eventKey="customer">{c("topTabs.customer")}</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="invoice">{c("topTabs.invoice")}</Nav.Link></Nav.Item>
        </Nav>

        {topTab === "customer" && (
          isCreate ? (
            <CustomerPanel
              formik={formik}
              customers={customers}
              refreshCustomers={refreshCustomers}
              onRequestNewCustomer={onRequestNewCustomer}
              resetKey={navKey}
              money={money}
            />
          ) : (
            <CustomerSummary customer={customer} userId={formik.values.userId} money={money} />
          )
        )}

        {topTab === "invoice" && (
          <InvoiceTab
            isCreate={isCreate}
            contractId={contractId}
            invoices={invoices}
            onInvoicesChange={onInvoicesChange}
            total={pricing.total}
            vatRate={formik.values.vatRate === "" ? 20 : formik.values.vatRate}
            money={money}
          />
        )}
      </Panel>

      <Panel title={c("panels.actions")}>
        <Nav
          variant="pills"
          activeKey={subTab}
          onSelect={(k) => k && setSubTab(k)}
          className="contract-page__subtabs mb-2"
        >
          {SUB_TABS.map((k) => (
            <Nav.Item key={k}><Nav.Link eventKey={k}>{c(`subTabs.${k}`)}</Nav.Link></Nav.Item>
          ))}
        </Nav>

        <div className="contract-page__sub-content">
          {subTab === "summary" && (
            <SummaryTab formik={formik} selectedCar={selectedCar} billableDays={billableDays} />
          )}

          {subTab === "payments" && (
            <PaymentsTab
              isCreate={isCreate}
              contractId={contractId}
              recordLabels={recordLabels}
              total={pricing.total}
              collected={collected}
              onPaymentsChange={loadPayments}
              money={money}
            />
          )}

          {subTab === "returnExtra" && (
            <ReturnExtraTab
              isCreate={isCreate}
              contractId={contractId}
              onChange={loadData}
              money={money}
              rentalStart={formik.values.pickUpDate}
              rentalEnd={formik.values.returnedAt
                ? moment(formik.values.returnedAt).format("YYYY-MM-DD")
                : formik.values.dropOffDate}
            />
          )}

          {subTab === "extension" && (
            <ExtensionTab
              isCreate={isCreate}
              contractId={contractId}
              minDate={formik.values.dropOffDate}
              periods={periods}
              isMonthly={formik.values.rentalType === "MONTHLY"}
              onExtended={loadData}
              money={money}
            />
          )}

          {subTab === "vehicleChange" && (
            <VehicleChangeTab
              isCreate={isCreate}
              contractId={contractId}
              carId={formik.values.carId}
              pickUpDate={formik.values.pickUpDate}
              dropOffDate={formik.values.dropOffDate}
              dropOffTime={formik.values.dropOffTime}
              vehicleChanges={vehicleChanges}
              onChanged={loadData}
            />
          )}
        </div>
      </Panel>

      <div className="contract-page__panel contract-page__panel--pricing">
        <div className="contract-page__panel-head">{c("pricingTitle")}</div>
        <PricingBlock
          formik={formik}
          pricing={pricing}
          billableDays={billableDays}
          periods={periods}
          collected={collected}
          money={money}
        />
      </div>
    </section>
  );
};

export default ContractRightCard;
