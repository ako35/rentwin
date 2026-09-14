import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Form, Modal, Table } from "react-bootstrap";
import ReactQuill from "react-quill-new";
import { BsFileText, BsPencil, BsTrash, BsUpload } from "react-icons/bs";
import { Loading } from "../../../components";
import { services } from "../../../services";
import { utils } from "../../../utils";
import "react-quill-new/dist/quill.snow.css";
import "./style.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;
const imageUrl = (id) => `${API_URL}/files/display/${id}`;

// Bold/italic/underline, headings, lists, link, and inline images (Quill's
// default image button embeds a picked file as base64 — fine for a couple of
// small in-post photos; a real upload-backed handler can replace this later
// if posts start leaning on many/large images).
const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image"],
    ["clean"],
  ],
};

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  publishedAt: "",
  published: true,
};

const trDate = (value) => (value ? new Date(value).toLocaleDateString("tr-TR") : "");

const AdminBlogPage = () => {
  const { t } = useTranslation("admin");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageId, setImageId] = useState(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const loadData = async () => {
    try {
      setPosts(await services.blog.getBlogPostsAdmin());
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (post) => {
    setEditing(post || {});
    setForm(
      post
        ? {
            title: post.title || "",
            slug: post.slug || "",
            excerpt: post.excerpt || "",
            content: post.content || "",
            publishedAt: post.publishedAt ? utils.functions.getDate(post.publishedAt) : "",
            published: post.published ?? true,
          }
        : EMPTY
    );
    setSlugTouched(!!post); // editing an existing post never auto-rewrites its slug
    setImageId(post?.imageId || null);
    setPreview(post?.imageId ? imageUrl(post.imageId) : "");
    setFile(null);
  };

  const closeModal = () => {
    setEditing(null);
    setFile(null);
    setPreview("");
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (!picked) return;
    setFile(picked);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(picked);
  };

  const removeImage = () => {
    setFile(null);
    setImageId(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const setTitle = (e) => {
    const title = e.target.value;
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugTouched ? prev.slug : utils.functions.slugify(title),
    }));
  };

  const setSlug = (e) => {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      let nextImageId = imageId;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const uploaded = await services.blog.uploadBlogImage(fd);
        nextImageId = uploaded.imageId;
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim(),
        content: form.content,
        imageId: nextImageId,
        publishedAt: form.publishedAt || null,
        published: form.published,
      };

      if (editing?.id) {
        await services.blog.updateBlogPost(editing.id, payload);
        utils.functions.swalToast(t("blogPage.toasts.updateSuccess"), "success");
      } else {
        await services.blog.addBlogPost(payload);
        utils.functions.swalToast(t("blogPage.toasts.createSuccess"), "success");
      }
      closeModal();
      loadData();
    } catch (error) {
      const isConflict = error?.response?.status === 409;
      utils.functions.swalToast(
        t(isConflict ? "blogPage.toasts.slugConflict" : editing?.id ? "blogPage.toasts.updateError" : "blogPage.toasts.createError"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (post) => {
    utils.functions
      .swalQuestion(t("blogPage.toasts.deleteConfirmTitle"), t("blogPage.toasts.deleteConfirmText"), {
        danger: true,
      })
      .then(async (result) => {
        if (!result.isConfirmed) return;
        try {
          await services.blog.deleteBlogPost(post.id);
          utils.functions.swalToast(t("blogPage.toasts.deleteSuccess"), "success");
          loadData();
        } catch (error) {
          utils.functions.swalToast(t("blogPage.toasts.deleteError"), "error");
        }
      });
  };

  return (
    <div className="admin-blog-page">
      <div className="admin-blog-page__toolbar">
        <h2>{t("blogPage.pageTitle")}</h2>
        <Button onClick={() => openModal(null)}>{t("blogPage.add")}</Button>
      </div>
      <p className="admin-blog-page__hint">{t("blogPage.hint")}</p>

      {loading ? (
        <Loading height={300} />
      ) : (
        <Table hover responsive className="admin-blog-page__table">
          <thead>
            <tr>
              <th>{t("blogPage.table.image")}</th>
              <th>{t("blogPage.table.title")}</th>
              <th>{t("blogPage.table.status")}</th>
              <th>{t("blogPage.table.date")}</th>
              <th>{t("blogPage.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">
                  {t("blogPage.empty")}
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <span className="admin-blog-page__thumb">
                    {post.imageId ? (
                      <img src={imageUrl(post.imageId)} alt={post.title} loading="lazy" />
                    ) : (
                      <BsFileText />
                    )}
                  </span>
                </td>
                <td>{post.title}</td>
                <td>
                  <Badge bg={post.published ? "success" : "secondary"}>
                    {post.published ? t("blogPage.published") : t("blogPage.draft")}
                  </Badge>
                </td>
                <td>{trDate(post.publishedAt)}</td>
                <td className="admin-blog-page__actions">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => openModal(post)}
                    title={t("blogPage.edit")}
                  >
                    <BsPencil />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(post)}
                    title={t("blogPage.delete")}
                  >
                    <BsTrash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={editing !== null} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing?.id ? t("blogPage.editTitle") : t("blogPage.addTitle")}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="admin-blog-page__modal">
          <Form.Group className="mb-3">
            <Form.Label>{t("blogPage.titleLabel")}</Form.Label>
            <Form.Control value={form.title} autoFocus onChange={setTitle} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("blogPage.slugLabel")}</Form.Label>
            <Form.Control value={form.slug} onChange={setSlug} />
            <Form.Text muted>{t("blogPage.slugHint")}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("blogPage.excerptLabel")}</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.excerpt} onChange={set("excerpt")} />
            <Form.Text muted>{t("blogPage.excerptHint")}</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("blogPage.contentLabel")}</Form.Label>
            <ReactQuill
              className="admin-blog-page__editor"
              theme="snow"
              modules={QUILL_MODULES}
              value={form.content}
              onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>{t("blogPage.imageLabel")}</Form.Label>
            <div className="admin-blog-page__image">
              {preview ? (
                <img src={preview} alt={form.title} />
              ) : (
                <span className="admin-blog-page__image-empty">
                  <BsFileText />
                  {t("blogPage.imageEmpty")}
                </span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            <div className="admin-blog-page__image-actions">
              <Button size="sm" variant="outline-primary" onClick={() => fileRef.current?.click()}>
                <BsUpload /> {t("blogPage.imageSelect")}
              </Button>
              {preview && (
                <Button size="sm" variant="outline-danger" onClick={removeImage}>
                  {t("blogPage.imageRemove")}
                </Button>
              )}
            </div>
            <Form.Text muted>{t("blogPage.imageHint")}</Form.Text>
          </Form.Group>

          <div className="admin-blog-page__row">
            <Form.Group className="mb-3">
              <Form.Label>{t("blogPage.publishedAtLabel")}</Form.Label>
              <Form.Control type="date" value={form.publishedAt} onChange={set("publishedAt")} />
            </Form.Group>
          </div>

          <Form.Check
            type="switch"
            id="blog-published"
            label={t("blogPage.publishedLabel")}
            checked={form.published}
            onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeModal} disabled={saving}>
            {t("blogPage.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.excerpt.trim() || !form.content.trim()}
          >
            {t("blogPage.save")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminBlogPage;
