import { useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { loginFailure, loginSuccess } from "../../../store";
import { useFormik } from "formik";
import { services } from "../../../services/";
import { utils } from "../../../utils";
import { CustomForm, PasswordInput } from "../../../components";
import { constants } from "../../../constants";
import "./style.scss";

const { routes } = constants;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation("auth");

    const onSubmit = async (values) => {
        setLoading(true);
        try {
            // istegini endpointe gonder
            const data = await services.user.login(values);
            // token'i sifrelenmis localstorage'e kaydet
            services.encryptedLocalStorage.setItem(
                "rentwintoken",
                data.token
            );
            // token ile kullanici bilgilerini al
            const responseUser = await services.user.getUser();
            // kullanici bilgilerini merkezi state'e kaydet
            dispatch(loginSuccess(responseUser));
            await utils.functions.swalToast(
                t("login.successToast"),
                "success"
            );
            navigate(
                responseUser?.roles?.includes("Administrator")
                    ? routes.adminDashboard
                    : routes.home
            );
        } catch (error) {
            dispatch(loginFailure());
            utils.functions.swalToast(error.response.data.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const formik = useFormik({
        initialValues: utils.initialValues.loginFormInitialValues,
        validationSchema: utils.validations.loginFormValidationSchema,
        onSubmit,
    });

    return (
        <Form noValidate onSubmit={formik.handleSubmit} className="login-form">
            <CustomForm
                formik={formik}
                name="email"
                label={t("login.emailLabel")}
                placeholder={t("login.emailPlaceholder")}
                type="email"
            />
            <PasswordInput
                formik={formik}
                name="password"
                label={t("login.passwordLabel")}
                placeholder={t("login.passwordPlaceholder")}
            />
            <Button
                type="submit"
                disabled={!(formik.dirty && formik.isValid) || loading}>
                {loading && <Spinner animation="border" size="sm" />} {t("login.loginButton")}
            </Button>
            <p>{t("login.or")}</p>
            <Button
                onClick={() => navigate(routes.register)}
                disabled={loading}>
                {t("login.registerButton")}
            </Button>
        </Form>
    );
};

export default LoginPage;
