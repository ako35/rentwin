import { useFormik } from "formik";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Form, Spinner } from "react-bootstrap";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import CustomForm from "../../custom-form/custom-form";
import StarRating from "../../star-rating/star-rating";
import KvkkConsent from "../../kvkk-consent/kvkk-consent";
import "./form.scss";

// Public review submission form (/yorumlar). A submitted review is always
// PENDING — it never joins the visible list until an admin approves it, so
// the success toast has to say that explicitly (unlike contact/register,
// there's a visible list here the visitor could otherwise expect to join).
const ReviewForm = ({ onSubmitted }) => {
  const { t } = useTranslation("reviews");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await services.review.submitReview(values);
      utils.functions.swalToast(t("form.successToast"), "success");
      formik.resetForm();
      onSubmitted?.();
    } catch (error) {
      utils.functions.swalToast(error?.response?.data?.message || t("form.errorToast"), "error");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: utils.initialValues.reviewFormInitialValues,
    validationSchema: utils.validations.reviewFormValidationSchema,
    onSubmit,
  });

  return (
    <Form noValidate onSubmit={formik.handleSubmit} className="review-form">
      <CustomForm formik={formik} name="name" label={t("form.name")} />

      <Form.Group className="mb-3">
        <Form.Label>{t("form.rating")}</Form.Label>
        <div>
          <StarRating
            value={formik.values.rating}
            onChange={(n) => formik.setFieldValue("rating", n)}
            size="1.75rem"
          />
        </div>
        {formik.touched.rating && formik.errors.rating && (
          <div className="review-form__rating-error">{formik.errors.rating}</div>
        )}
      </Form.Group>

      <CustomForm formik={formik} name="body" label={t("form.body")} type="textarea" rows={4} />

      {/* Honeypot. Off-screen (not display:none — some bots skip that check),
          never shown or announced to a real visitor. A non-empty value is
          silently discarded server-side (reviews.controller.js submitReview)
          rather than rejected, so a bot gets no signal to adjust. */}
      <Form.Group className="review-form__honeypot" aria-hidden="true">
        <Form.Label htmlFor="review-company">Şirket</Form.Label>
        <Form.Control
          id="review-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={formik.values.company}
          onChange={formik.handleChange}
        />
      </Form.Group>

      <KvkkConsent formik={formik} ns="reviews" i18nKey="form.kvkk" />

      <Button type="submit" disabled={!(formik.dirty && formik.isValid) || loading} className="w-100">
        {loading && <Spinner animation="border" size="sm" />} {t("form.submit")}
      </Button>
    </Form>
  );
};

export default ReviewForm;
