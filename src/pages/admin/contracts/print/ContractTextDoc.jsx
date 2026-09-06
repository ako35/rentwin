import {
  CompanyHeader,
  PartiesBlock,
  VehicleBlock,
  RentalBlock,
  Signatures,
} from "./print-primitives";

// The plain "Sözleşme" / "Ek-1" sheet: standard header + parties/vehicle/rental
// blocks, then the legal body text (still a placeholder until the templates are
// supplied) and the signature lines.
const ContractTextDoc = ({ titleKey, data, p }) => (
  <>
    <CompanyHeader subtitle={p(`${titleKey}.title`)} data={data} p={p} />
    <PartiesBlock data={data} p={p} />
    <VehicleBlock data={data} p={p} />
    <RentalBlock data={data} p={p} />
    <section className="cprint-block cprint-block--body">
      <h2>{p(`${titleKey}.bodyTitle`)}</h2>
      <p className="cprint-placeholder">{p(`${titleKey}.placeholder`)}</p>
    </section>
    <Signatures leftLabel={p("signLessor")} rightLabel={p("signLessee")} />
  </>
);

export default ContractTextDoc;
