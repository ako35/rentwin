const test = require("node:test");
const assert = require("node:assert/strict");
const { extractDocumentWithGemini } = require("./gemini-document-extraction");

const withGeminiConfig = async (run) => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_DOCUMENT_MODEL;
  const previousFallback = process.env.GEMINI_DOCUMENT_FALLBACK_MODEL;
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
    if (previousFallback === undefined) delete process.env.GEMINI_DOCUMENT_FALLBACK_MODEL;
    else process.env.GEMINI_DOCUMENT_FALLBACK_MODEL = previousFallback;
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

test("extracts appointment details from an appointment confirmation", async () => {
  await withGeminiConfig(async () => {
    const appointment = {
      documentDetected: true,
      type: "Emission",
      appointmentDate: "2026-11-12",
      appointmentTime: "14:30",
      station: "İzmir Egzoz İstasyonu",
      bookingCode: "RND-123",
      cost: 450,
    };
    global.fetch = async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.match(request.contents[0].parts[1].text, /randevu onayını/i);
      assert.equal(
        request.generationConfig.responseSchema.properties.appointmentTime.type,
        "STRING"
      );
      assert.deepEqual(
        request.generationConfig.responseSchema.properties.type.enum,
        ["Periodic", "Emission"]
      );
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify(appointment) }] } }],
        }),
      };
    };

    const result = await extractDocumentWithGemini({
      buffer: Buffer.from("appointment confirmation"),
      mimeType: "image/jpeg",
      kind: "inspectionAppointment",
    });

    assert.deepEqual(result, appointment);
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

test("falls back to the second model when the first is overloaded", async () => {
  await withGeminiConfig(async () => {
    process.env.GEMINI_DOCUMENT_FALLBACK_MODEL = "lite-model";
    const urls = [];
    global.fetch = async (url) => {
      urls.push(url);
      if (url.includes("/test-model:")) return { ok: false, status: 503 };
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ documentDetected: true, licensePlate: "35ABC123" }) }] } }],
        }),
      };
    };

    const result = await extractDocumentWithGemini({ buffer: Buffer.from("x"), mimeType: "image/png", kind: "registration" });

    assert.deepEqual(result, { documentDetected: true, licensePlate: "35ABC123" });
    assert.equal(urls.length, 2);
    assert.match(urls[1], /\/lite-model:generateContent$/);
  });
});

test("reports a timeout as AI_TIMEOUT and tries the fallback model", async () => {
  await withGeminiConfig(async () => {
    process.env.GEMINI_DOCUMENT_FALLBACK_MODEL = "lite-model";
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      throw new DOMException("This operation was aborted", "AbortError");
    };

    await assert.rejects(
      extractDocumentWithGemini({ buffer: Buffer.from("x"), mimeType: "image/png", kind: "registration" }),
      (error) => error.code === "AI_TIMEOUT"
    );
    assert.equal(calls, 2);
  });
});

test("does not retry on another model when the API key is rejected", async () => {
  await withGeminiConfig(async () => {
    process.env.GEMINI_DOCUMENT_FALLBACK_MODEL = "lite-model";
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return { ok: false, status: 403 };
    };

    await assert.rejects(
      extractDocumentWithGemini({ buffer: Buffer.from("x"), mimeType: "image/png", kind: "registration" }),
      (error) => error.code === "AI_CONFIG"
    );
    assert.equal(calls, 1);
  });
});
