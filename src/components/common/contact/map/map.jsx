import { constants } from "../../../../constants";
import MapEmbed from "../../map-embed/map-embed";
import './map.scss';

const { website } = constants;

const ContactMap = () => {
  return (
    <div className="contact-map">
      <MapEmbed
        title={website.name}
        src={website.mapEmbedUrl}
        openUrl={website.mapUrl}
        caption={`${website.streetAddress}, ${website.postalCode} ${website.addressLocality}/${website.addressRegion}`}
        height={500}
      />
    </div>
  );
};

export default ContactMap;
