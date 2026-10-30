const test = require("node:test");
const assert = require("node:assert/strict");
const { extractDocumentWithGemini } = require("./gemini-document-extraction");

const withGeminiConfig = async (run) => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_DOCUMENT_MODEL;
  process.env.GEMINI_API_KEY = "test-api-key";
  process.env.GEMINI_DOCUMENT_MODEL = "test-model";

  try {
    await run();
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GEMINI_DOCUMENT_MODEL;
    else process.env.GEMINI_DOCUMENT_MODEL = previousModel;
  }
};

test("sends the document to Gemini and parses structured fields", async () => {
  await withGeminiConfig(async () => {
    const file = Buffer.from("sample document");
    global.fetch = async (url, options) => {
      assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent");
      assert.equal(options.headers["x-goog-api-key"], "test-api-key");
      const request = JSON.parse(options.body);
      assert.equal(request.contents[0].parts[0].inline_data.data, file.toString("base64"));
      assert.equal(request.contents[0].parts[0].inline_data.mime_type, "application/pdf");
      assert.equal(request.generationConfig.responseMimeType, "application/json");
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ documentDetected: true, number: "FTR-123" }) }],
              },
            },
          ],
        }),
      };
    };

    const result = await extractDocumentWithGemini({
      buffer: file,
      mimeType: "application/pdf",
      kind: "invoice",
    });

    assert.deepEqual(result, { documentDetected: true, number: "FTR-123" });
  });
});

test("rejects unsupported kinds and empty files before making a request", async () => {
  await assert.rejects(
    extractDocumentWithGemini({ buffer: Buffer.from("x"), mimeType: "image/png", kind: "unknown" }),
    { code: "AI_REQUEST" }
  );
  await assert.rejects(
    extractDocumentWithGemini({ buffer: Buffer.alloc(0), mimeType: "image/png", kind: "invoice" }),
    { code: "AI_FILE" }
  );
});

test("classifies Gemini authentication failures without exposing the API key", async () => {
  await withGeminiConfig(async () => {
    global.fetch = async () => ({ ok: false, status: 403 });

    await assert.rejects(
      extractDocumentWithGemini({
        buffer: Buffer.from("sample"),
        mimeType: "image/png",
        kind: "registration",
      }),
      (error) => {
        assert.equal(error.code, "AI_CONFIG");
        assert.doesNotMatch(error.message, /test-api-key/);
        return true;
      }
    );
  });
});

test("rejects non-JSON Gemini responses", async () => {
  await withGeminiConfig(async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
    });

    await assert.rejects(
      extractDocumentWithGemini({
        buffer: Buffer.from("sample"),
        mimeType: "image/png",
        kind: "individual",
      }),
      { code: "AI_RESPONSE" }
    );
  });
});
