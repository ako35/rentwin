import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { constants } from "../../../constants";

const {
  website: { social = {} },
} = constants;

// react-icons 4.10 predates the X logo, so it's inlined (Simple Icons, CC0).
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

// Rentwin's live social profiles in display order, shared by the header top
// bar and the footer. Only profiles filled in constants `website.social` are
// listed — an account not opened yet simply has no icon.
export const socialNetworks = [
  { key: "instagram", name: "Instagram", Icon: FaInstagram },
  { key: "facebook", name: "Facebook", Icon: FaFacebookF },
  { key: "youtube", name: "YouTube", Icon: FaYoutube },
  { key: "x", name: "X", Icon: XIcon },
]
  .filter((network) => social[network.key])
  .map((network) => ({ ...network, href: social[network.key] }));
