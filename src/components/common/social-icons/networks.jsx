import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { constants } from "../../../constants";
import XIcon from "./x-icon";

const {
  website: { social = {} },
} = constants;

// "@rentwin_tr" from ".../rentwin_tr/" or ".../@rentwin_tr".
const handleFromUrl = (href) => {
  try {
    const path = new URL(href).pathname.replace(/^\/+|\/+$/g, "").replace(/^@/, "");
    return path ? `@${path}` : "";
  } catch {
    return "";
  }
};

// Rentwin's live social profiles in display order, shared by the header top
// bar, the footer and the homepage FollowUs band. Only profiles filled in
// constants `website.social` are listed — an account not opened yet simply
// has no icon.
export const socialNetworks = [
  { key: "instagram", name: "Instagram", Icon: FaInstagram },
  { key: "facebook", name: "Facebook", Icon: FaFacebookF },
  { key: "youtube", name: "YouTube", Icon: FaYoutube },
  { key: "x", name: "X", Icon: XIcon },
]
  .filter((network) => social[network.key])
  .map((network) => ({
    ...network,
    href: social[network.key],
    handle: handleFromUrl(social[network.key]),
  }));
