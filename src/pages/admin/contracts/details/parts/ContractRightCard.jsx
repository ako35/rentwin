import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Nav } from "react-bootstrap";
import { CustomForm } from "../../../../../components";
import CustomerPanel from "./CustomerPanel";
import CustomerSummary from "./CustomerSummary";
import DriversTab from "./DriversTab";
import InvoiceTab from "./InvoiceTab";
import SummaryTab from "./SummaryTab";
import PaymentsTab from "./PaymentsTab";
import ExtensionTab from "./ExtensionTab";
import VehicleChangeTab from "./VehicleChangeTab";
import PricingBlock from "./PricingBlock";

const SUB_TABS = ["summary", "payments", "returnExtra", "extension", "vehicleChange"];

// The right column of the contract screen: customer / drivers / invoice top
// tabs, the summary / payments / return-extra / extension sub tabs, the pricing
// block and the running balance. Owns its own tab selection.
const ContractRightCard = ({
  isCreate, contractId, formik, navKey,
  customers, customer, invoice, extensions, vehicleChanges,
  refreshCustomers, onRequestNewCustomer, onInvoiceCreated, loadData, loadPayments,
  selectedCar, billableDays, pricing, collected, extensionDays, extensionTotal,
  recordLabels, updating, money,
}) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);
  const [topTab, setTopTab] = useState("customer");
  const [subTab, setSubTab] = useState("summary");

  return (
    <section className="contract-card">
      <Nav variant="tabs" activeKey={topTab} onSelect={(k) => k && setTopTab(k)} className="mb-3">
        <Nav.Item><Nav.Link eventKey="customer">{c("topTabs.customer")}</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="drivers">{c("topTabs.drivers")}</Nav.Link></Nav.Item>
        <Nav.Item><Nav.Link eventKey="invoice">{c("topTabs.invoice")}</Nav.Link></Nav.Item>
      </Nav>

      {topTab === "customer" && (
        <div className="contract-page__top-content">
          {isCreate ? (
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
          )}
        </div>
      )}

      {topTab === "drivers" && (
        <div className="contract-page__top-content">
          <DriversTab isCreate={isCreate} contractId={contractId} recordLabels={recordLabels} />
        </div>
      )}

      {topTab === "invoice" && (
        <div className="contract-page__top-content">
          <InvoiceTab
            isCreate={isCreate}
            contractId={contractId}
            invoice={invoice}
            onInvoiceCreated={onInvoiceCreated}
            money={money}
          />
        </div>
      )}

      <Nav
        variant="pills"
        activeKey={subTab}
        onSelect={(k) => k && setSubTab(k)}
        className="contract-page__subtabs mt-3 mb-2"
      >
        {SUB_TABS.map((k) => (
          <Nav.Item key={k}><Nav.Link eventKey={k}>{c(`subTabs.${k}`)}</Nav.Link></Nav.Item>
        ))}
      </Nav>

      <div className="contract-page__sub-content">
        {subTab === "summary" && (
          <SummaryTab
            formik={formik}
            selectedCar={selectedCar}
            billableDays={billableDays}
          />
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
          <CustomForm formik={formik} name="returnExtraAmount" label={c("returnExtraAmount")} type="number" />
        )}

        {subTab === "extension" && (
          <ExtensionTab
            isCreate={isCreate}
            contractId={contractId}
            minDate={formik.values.dropOffDate}
            extensions={extensions}
            onExtended={loadData}
            money={money}
          />
        )}

        {subTab === "vehicleChange" && (
          <VehicleChangeTab
            isCreate={isCreate}
            contractId={contractId}
            pickUpDate={formik.values.pickUpDate}
            dropOffDate={formik.values.dropOffDate}
            dropOffTime={formik.values.dropOffTime}
            vehicleChanges={vehicleChanges}
            onChanged={loadData}
          />
        )}
      </div>

      <PricingBlock
        formik={formik}
        pricing={pricing}
        billableDays={billableDays}
        extensionDays={extensionDays}
        extensionTotal={extensionTotal}
        isCreate={isCreate}
        updating={updating}
        money={money}
      />

      <div className="contract-page__balance">
        <strong>{money(collected - pricing.total)} TL</strong>
        <span>{c("balance").toUpperCase()}</span>
      </div>
    </section>
  );
};

export default ContractRightCard;
