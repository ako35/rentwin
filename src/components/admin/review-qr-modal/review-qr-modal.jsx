import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Modal } from "react-bootstrap";
import { BsCheck2, BsDownload, BsShare } from "react-icons/bs";
import { constants } from "../../../constants";
import "./review-qr-modal.scss";

// The printed A6 card's artwork (public/yorum-qr-kart.png). Its QR opens
// constants.website.googleReviewUrl — regenerate the card if that URL changes.
const CARD_SRC = "/yorum-qr-kart.png";
const CARD_FILE_NAME = "rentwin-google-yorum-qr.png";

const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function";

// Google review QR card for asking in person: show it on screen at the
// counter or at car return, and the customer scans it with their own phone.
// It can also be downloaded (to print) or shared as an image. With a
// `customerName`, the modal is about that one customer and offers to tick
// them off the "Google Yorumu İste" list via `onMarkRequested`.
const ReviewQrModal = ({ show, onHide, customerName, onMarkRequested }) => {
  const { t } = useTranslation("admin");
  const q = (key) => t(`googleReviewsPage.qr.${key}`);
  const [marked, setMarked] = useState(false);

  const share = async () => {
    try {
      const blob = await (await fetch(CARD_SRC)).blob();
      const file = new File([blob], CARD_FILE_NAME, { type: "image/png" });
      const data = { text: t("googleReviewsPage.qr.shareText", { url: constants.website.googleReviewUrl }) };
      if (navigator.canShare?.({ files: [file] })) data.files = [file];
      await navigator.share(data);
    } catch (error) {
      // Closing the share sheet rejects with AbortError — nothing to report.
    }
  };

  const markRequested = () => {
    onMarkRequested?.();
    setMarked(true);
  };

  return (
    <Modal show={show} onHide={onHide} onShow={() => setMarked(false)} centered fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title>{customerName || q("title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="review-qr-modal__body">
        <p className="review-qr-modal__hint">{q("hint")}</p>
        <img className="review-qr-modal__card" src={CARD_SRC} alt={q("alt")} />
      </Modal.Body>
      <Modal.Footer className="review-qr-modal__footer">
        <Button as="a" variant="outline-secondary" href={CARD_SRC} download={CARD_FILE_NAME}>
          <BsDownload /> {q("download")}
        </Button>
        {canShare() && (
          <Button variant="outline-secondary" onClick={share}>
            <BsShare /> {q("share")}
          </Button>
        )}
        {onMarkRequested && (
          <Button variant={marked ? "success" : "primary"} disabled={marked} onClick={markRequested}>
            <BsCheck2 /> {marked ? q("marked") : q("markRequested")}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ReviewQrModal;
