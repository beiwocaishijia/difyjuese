import "dotenv/config";
import express from "express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || "https://api.dify.ai/v1";
const ROLE_A_KEY = process.env.DIFY_API_KEY_ROLE_A;
const ROLE_B_KEY = process.env.DIFY_API_KEY_ROLE_B;

function getApiKeyByRole(role) {
  if (role === "a") return ROLE_A_KEY;
  if (role === "b") return ROLE_B_KEY;
  return undefined;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    difyBaseUrl: DIFY_BASE_URL,
    hasRoleAKey: Boolean(ROLE_A_KEY),
    hasRoleBKey: Boolean(ROLE_B_KEY)
  });
});

app.post("/api/chat/:role", async (req, res) => {
  try {
    const role = String(req.params.role || "").toLowerCase();
    const apiKey = getApiKeyByRole(role);
    if (!apiKey) return res.status(400).json({ error: "Unknown role or missing API key." });

    const { message, conversation_id, user, inputs } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message (string)." });
    }

    const userId = user && typeof user === "string" ? user : "web-user";
    const extraInputs = inputs && typeof inputs === "object" && !Array.isArray(inputs) ? inputs : {};

    const payload = {
      inputs: {
        user_name: userId,
        ...extraInputs
      },
      query: message,
      response_mode: "blocking",
      user: userId,
      conversation_id: conversation_id && typeof conversation_id === "string" ? conversation_id : undefined
    };

    const r = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Dify API error",
        status: r.status,
        details: data
      });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error", details: String(e?.message || e) });
  }
});

const port = Number(process.env.PORT || 5173);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});

