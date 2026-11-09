import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { AppLink, JsonLd, Loading, PageHeader, Spacer } from "../../../../components";
import { usePageMeta } from "../../../../hooks/use-page-meta";
import { breadcrumbLd, articleLd } from "../../../../utils/seo";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import { responsiveImage } from "../../../../utils/image-url";
import "../style.scss";

const { routes } = constants;
const API_URL = import.meta.env.VITE_APP_API_URL;

const BlogDetailPage = () => {
  const { slug } = useParams();
  const { t, i18n } = useTranslation("blog");
  const { t: tCommon } = useTranslation("common");
  const dateLocale = i18n.language === "en" ? "en-GB" : "tr-TR";

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMissing(false);
    services.blog
      .getBlogPostBySlug(slug)
      .then((data) => setPost(data))
      // Only a real 404 (unknown slug / unpublished draft) means the post is
      // actually gone — a transient network/server error must not noindex an
      // otherwise-live post. The "not found" UI below still covers both
      // cases (it keys off `post` being null), only the SEO signal changes.
      .catch((error) => setMissing(error?.response?.status === 404))
      .finally(() => setLoading(false));
  }, [slug]);

  usePageMeta({
    title: post ? post.title : t("seoTitle"),
    description: post ? post.excerpt : t("seoDescription"),
    noindex: missing,
    statusCode: missing ? 404 : undefined,
    // Posts are written in Turkish only — /en/blog/:slug canonicalizes to the TR URL.
    monolingual: true,
  });

  if (loading) return <Loading height={400} />;

  if (!post) {
    return (
      <Container className="blog-page">
        <Spacer />
        <p className="blog-page__empty">{t("detail.notFound")}</p>
        <p>
          <AppLink to={routes.blog}>{t("detail.backToList")}</AppLink>
        </p>
        <Spacer />
      </Container>
    );
  }

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle"), path: routes.blog },
          { name: post.title },
        ])}
      />
      <JsonLd
        id="ld-article"
        data={articleLd({
          title: post.title,
          excerpt: post.excerpt,
          image: post.imageId ? `${API_URL}/files/display/${post.imageId}` : undefined,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          path: `${routes.blog}/${post.slug}`,
        })}
      />
      <PageHeader title={post.title} crumbs={[{ label: t("pageTitle"), to: routes.blog }]} />
      <Spacer />
      <Container className="blog-post">
        <AppLink to={routes.blog} className="blog-post__back">
          &larr; {t("detail.backToList")}
        </AppLink>

        <span className="blog-post__date">
          {t("publishedOn", { date: new Date(post.publishedAt).toLocaleDateString(dateLocale) })}
        </span>

        {post.imageId && (
          <div className="blog-post__hero">
            <img
              {...responsiveImage(post.imageId, { widths: [480, 640, 960, 1280], fallback: 960, sizes: "(max-width: 900px) 92vw, 860px" })}
              alt={post.title}
              decoding="async"
            />
          </div>
        )}

        <div className="blog-post__content" dangerouslySetInnerHTML={{ __html: post.content }} />
      </Container>
      <Spacer />
    </>
  );
};

export default BlogDetailPage;
