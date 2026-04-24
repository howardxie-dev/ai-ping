import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const created = 1710000000;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return sendJson(res, 200, {
      object: "list",
      data: [
        {
          id: "demo-model",
          object: "model",
          created,
          owned_by: "ai-ping",
        },
      ],
    });
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const parseResult = await readJsonBody(req);
    if (!parseResult.ok) {
      return sendJson(res, 400, {
        error: {
          message: "Invalid JSON body",
          type: "invalid_request_error",
          code: "invalid_json",
        },
      });
    }

    const body = parseResult.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || !body.model) {
      return sendJson(res, 400, {
        error: {
          message: "Missing required field: model",
          type: "invalid_request_error",
          param: "model",
          code: "missing_required_field",
        },
      });
    }

    if (body.stream === true) {
      return sendStream(res);
    }

    return sendJson(res, 200, {
      id: "chatcmpl-demo",
      object: "chat.completion",
      created,
      model: body.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "pong",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 1,
        total_tokens: 6,
      },
    });
  }

  return sendJson(res, 404, {
    error: {
      message: "Not found",
      type: "invalid_request_error",
      code: "not_found",
    },
  });
});

server.listen(port, host, () => {
  console.log(`OpenAI-compatible mock listening on http://${host}:${port}`);
});

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function sendStream(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });

  const chunks = [
    'data: {"id":"chatcmpl-demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"pong"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-demo","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    "data: [DONE]\n\n",
  ];

  for (const chunk of chunks) {
    res.write(chunk);
  }

  res.end();
}

async function readJsonBody(req) {
  const chunks = [];

  try {
    for await (const chunk of req) {
      chunks.push(chunk);
    }
  } catch {
    return { ok: false };
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (rawBody.length === 0) {
    return { ok: true, body: {} };
  }

  try {
    return { ok: true, body: JSON.parse(rawBody) };
  } catch {
    return { ok: false };
  }
}
