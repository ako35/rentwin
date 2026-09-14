import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsFileText } from "react-icons/bs";
import { AppLink, JsonLd, Loading, PageHeader, Spacer } from "../../../components";
import { usePageMeta, SITE_URL } from "../../../hooks/use-page-meta";
import { breadcrumbLd, itemListLd } from "../../../utils/seo";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { useLocale } from "../../../hooks/use-locale";
import { localizePath } from "../../../i18n/locale-routing";
import "./style.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const BlogPage = () => {
  const { t, i18n } = useTranslation("blog");
  const { t: tCommon } = useTranslation("common");
  const locale = useLocale();
  const dateLocale = i18n.language === "en" ? "en-GB" : "tr-TR";
  usePageMeta(t("seoTitle"), t("seoDescription"));

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    services.blog
      .getBlogPosts()
      .then((data) => setPosts(data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      {!loading && posts.length > 0 && (
        <JsonLd
          id="ld-itemlist"
          data={itemListLd({
            name: t("pageTitle"),
            itemListElement: posts.map((p, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: p.title,
              url: `${SITE_URL}${localizePath(`${routes.blog}/${p.slug}`, locale)}`,
            })),
          })}
        />
      )}
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <Container className="blog-page">
        <p className="blog-page__intro">{t("intro")}</p>

        {loading ? (
          <Loading height={300} />
        ) : posts.length === 0 ? (
          <p className="blog-page__empty">{t("empty")}</p>
        ) : (
          <div className="blog-page__grid">
            {posts.map((p) => (
              <AppLink key={p.id} to={`${routes.blog}/${p.slug}`} className="blog-card">
                <span className="blog-card__media">
                  {p.imageId ? (
                    <img src={`${API_URL}/files/display/${p.imageId}`} alt={p.title} loading="lazy" />
                  ) : (
                    <BsFileText />
                  )}
                </span>
                <span className="blog-card__body">
                  <span className="blog-card__date">
                    {new Date(p.publishedAt).toLocaleDateString(dateLocale)}
                  </span>
                  <span className="blog-card__title">{p.title}</span>
                  <span className="blog-card__excerpt">{p.excerpt}</span>
                  <span className="blog-card__cta">
                    {t("readMore")} <BsArrowRight />
                  </span>
                </span>
              </AppLink>
            ))}
          </div>
        )}
      </Container>
      <Spacer />
    </>
  );
};

export default BlogPage;
