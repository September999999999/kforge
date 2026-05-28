import http, { type IncomingMessage, type Server, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  agentBoard,
  agentLaunch,
  bootstrapRepo,
  dashboardRepo,
  doctorRepo,
  inspectRepo,
  listRuns,
  refreshRepo,
  applyReview,
  reviewQueue,
  taskList,
  updateReviewContent,
  updateReviewStatus,
  type CommandResult,
  type ReviewStatus,
} from "./repo.js";

export interface WebDashboardOptions {
  host?: string;
  port?: number;
}

export interface WebDashboardHandle {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

export async function serveWebDashboard(repoPath: string, options: WebDashboardOptions = {}): Promise<WebDashboardHandle> {
  const resolvedRepoPath = path.resolve(repoPath);
  const host = options.host ?? "127.0.0.1";
  const requestedPort = options.port ?? 4173;
  const server = http.createServer((request, response) => {
    void handleWebRequest(resolvedRepoPath, request, response);
  });

  await listenWithFallback(server, host, requestedPort);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("web server did not expose a TCP address");
  }

  const addressHost = address.address === "127.0.0.1" || address.address === "::1" ? "127.0.0.1" : address.address;
  const url = `http://${addressHost}:${address.port}`;
  return {
    server,
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function handleWebRequest(repoPath: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/") {
      sendText(response, 200, "text/html; charset=utf-8", webDashboardHtml());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/state") {
      sendJson(response, 200, webDashboardState(repoPath));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/file") {
      const file = optionalString(url.searchParams.get("path") ?? url.searchParams.get("file"));
      if (!file) {
        sendJson(response, 400, { ok: false, error: "file path is required" });
        return;
      }
      const result = webFilePayload(repoPath, file);
      sendJson(response, result.ok ? 200 : 400, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/refresh") {
      const result = refreshRepo(repoPath);
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/review-status") {
      const body = await readJsonBody(request);
      const file = optionalString(body.file);
      const status = webReviewStatus(body.status);
      if (!file || !status) {
        sendJson(response, 400, { ok: false, error: "review file and status are required" });
        return;
      }
      const result = updateReviewStatus(repoPath, { file, status, note: optionalString(body.note), json: true });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/review-content") {
      const body = await readJsonBody(request);
      const file = optionalString(body.file);
      const content = optionalString(body.content);
      if (!file || !content) {
        sendJson(response, 400, { ok: false, error: "review file and proposed content are required" });
        return;
      }
      const result = updateReviewContent(repoPath, { file, content, json: true });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/review-apply-preview") {
      const body = await readJsonBody(request);
      const file = optionalString(body.file);
      if (!file) {
        sendJson(response, 400, { ok: false, error: "review file is required" });
        return;
      }
      const result = applyReview(repoPath, { file, dryRun: true, json: true });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/review-apply") {
      const body = await readJsonBody(request);
      const file = optionalString(body.file);
      if (!file) {
        sendJson(response, 400, { ok: false, error: "review file is required" });
        return;
      }
      const result = applyReview(repoPath, {
        file,
        note: optionalString(body.note) ?? "Applied from kforge web dashboard.",
        json: true,
      });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/bootstrap") {
      const body = await readJsonBody(request);
      const agents = stringList(body.agents);
      const limit = positiveNumber(body.limit);
      const result = bootstrapRepo(repoPath, { agents, limit, json: true });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/agent-launch") {
      const body = await readJsonBody(request);
      const agents = stringList(body.agents);
      const command = optionalString(body.command);
      const noPlan = Boolean(body.noPlan);
      const result = agentLaunch(repoPath, { agents, command, noPlan, write: true, json: true });
      sendJson(response, result.ok ? 200 : 400, commandResponse(result));
      return;
    }

    sendJson(response, 404, { ok: false, error: "not found" });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function webDashboardState(repoPath: string): Record<string, unknown> {
  return {
    ok: true,
    repoPath,
    updatedAt: new Date().toISOString(),
    dashboard: parseJsonResult(dashboardRepo(repoPath, { json: true })),
    doctor: parseJsonResult(doctorRepo(repoPath, { json: true })),
    reviews: parseJsonResult(reviewQueue(repoPath, { status: "all", limit: 25, json: true })),
    tasks: parseJsonResult(taskList(repoPath, { status: "all", json: true })),
    runs: parseJsonResult(listRuns(repoPath, { status: "all", json: true })),
    agents: parseJsonResult(agentBoard(repoPath, { json: true })),
  };
}

function webFilePayload(repoPath: string, file: string): Record<string, unknown> {
  const fileRef = normalizeWebRepoRef(file);
  const inspect = inspectRepo(repoPath, { file: fileRef });
  if (!inspect.ok) {
    return commandResponse(inspect);
  }

  const target = path.resolve(repoPath, fileRef);
  const stats = fs.statSync(target);
  const maxBytes = 256 * 1024;
  const raw = fs.readFileSync(target);
  const content = raw.subarray(0, maxBytes).toString("utf8");
  return {
    ok: true,
    file: fileRef,
    size: stats.size,
    truncated: raw.length > maxBytes,
    inspect: inspect.messages[0] ?? "",
    content,
  };
}

function commandResponse(result: CommandResult): Record<string, unknown> {
  const parsed = maybeJson(result.messages[0]);
  return {
    ok: result.ok,
    messages: result.messages,
    ...(parsed ? { payload: parsed } : {}),
  };
}

function parseJsonResult(result: CommandResult): unknown {
  if (!result.ok) {
    return commandResponse(result);
  }
  return JSON.parse(result.messages[0] ?? "{}") as unknown;
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeWebRepoRef(value: string): string {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

function webReviewStatus(value: unknown): ReviewStatus | undefined {
  return value === "proposed" || value === "accepted" || value === "rejected" ? value : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number") {
    return undefined;
  }
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function maybeJson(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  sendText(response, status, "application/json; charset=utf-8", `${JSON.stringify(body, null, 2)}\n`);
}

function sendText(response: ServerResponse, status: number, contentType: string, body: string): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  response.end(body);
}

async function listenWithFallback(server: Server, host: string, port: number): Promise<void> {
  try {
    await listen(server, host, port);
  } catch (error) {
    if (port !== 0 && isAddressInUse(error)) {
      await listen(server, host, 0);
      return;
    }
    throw error;
  }
}

function listen(server: Server, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function isAddressInUse(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "EADDRINUSE");
}

function webDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kforge dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8f5;
      --surface: #ffffff;
      --surface-2: #eef3ee;
      --text: #15201b;
      --muted: #5f6f68;
      --border: #d9e0da;
      --accent: #136f63;
      --accent-2: #1f5fbf;
      --warn: #a66500;
      --danger: #a33a31;
      --shadow: 0 10px 30px rgba(28, 45, 35, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
      letter-spacing: 0;
    }
    button, input, textarea {
      font: inherit;
      letter-spacing: 0;
    }
    .shell {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      min-height: 100vh;
    }
    aside {
      border-right: 1px solid var(--border);
      background: #fbfcfa;
      padding: 22px 18px;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    main {
      padding: 24px;
      max-width: 1320px;
      width: 100%;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 18px;
    }
    .mark {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      background: var(--accent);
      color: white;
      font-weight: 800;
    }
    nav {
      display: grid;
      gap: 6px;
      margin-top: 18px;
    }
    nav a {
      color: var(--muted);
      text-decoration: none;
      padding: 8px 10px;
      border-radius: 6px;
      font-weight: 600;
    }
    nav a:hover { background: var(--surface-2); color: var(--text); }
    .repo {
      color: var(--muted);
      font-size: 12px;
      word-break: break-all;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    h1 {
      font-size: 26px;
      line-height: 1.15;
      margin: 0 0 6px;
      font-weight: 760;
    }
    h2 {
      font-size: 15px;
      margin: 0;
      font-weight: 720;
    }
    .subtle { color: var(--muted); }
    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .button {
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      border-radius: 6px;
      padding: 8px 11px;
      cursor: pointer;
      font-weight: 680;
      min-height: 36px;
    }
    .button.primary {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .button.danger {
      color: var(--danger);
      border-color: #e2aaa4;
      background: #fff8f7;
    }
    .button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    .button.small {
      min-height: 30px;
      padding: 5px 8px;
      font-size: 12px;
    }
    .grid {
      display: grid;
      gap: 14px;
    }
    .metrics {
      grid-template-columns: repeat(6, minmax(120px, 1fr));
      margin-bottom: 14px;
    }
    .metric {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 13px;
      box-shadow: var(--shadow);
    }
    .metric strong {
      display: block;
      font-size: 24px;
      line-height: 1;
      margin-bottom: 5px;
    }
    .metric span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 680;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
      gap: 14px;
      align-items: start;
    }
    section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 13px 14px;
      border-bottom: 1px solid var(--border);
      background: #fbfcfa;
    }
    .section-body { padding: 14px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 9px 8px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
    }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      background: var(--surface-2);
      padding: 2px 4px;
      border-radius: 4px;
      word-break: break-word;
    }
    .status {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid var(--border);
      font-weight: 720;
      font-size: 12px;
    }
    .status.ok { color: var(--accent); border-color: #9ccbc1; background: #eef8f5; }
    .status.warn { color: var(--warn); border-color: #dfc287; background: #fff8e8; }
    .status.bad { color: var(--danger); border-color: #e2aaa4; background: #fff0ef; }
    form {
      display: grid;
      gap: 9px;
    }
    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-weight: 700;
      font-size: 12px;
    }
    input, textarea {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 9px;
      background: #fff;
      color: var(--text);
      min-width: 0;
    }
    textarea {
      min-height: 74px;
      resize: vertical;
    }
    .content-editor {
      margin: 10px 0 12px;
      display: grid;
      gap: 8px;
    }
    .content-editor textarea {
      min-height: 180px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    .stack { display: grid; gap: 14px; }
    .toast {
      min-height: 20px;
      color: var(--muted);
      font-size: 13px;
    }
    .empty {
      color: var(--muted);
      padding: 10px 0;
    }
    .viewer-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .viewer-meta code { max-width: 100%; }
    .viewer-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .viewer-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
      gap: 12px;
    }
    pre {
      margin: 0;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #fbfcfa;
      padding: 10px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 420px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    .preview-output {
      margin-top: 12px;
    }
    @media (max-width: 980px) {
      .shell { grid-template-columns: 1fr; }
      aside {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
      main { padding: 18px; }
      .metrics { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
      .layout { grid-template-columns: 1fr; }
      .viewer-grid { grid-template-columns: 1fr; }
      header { display: grid; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand"><div class="mark">k</div><div>kforge</div></div>
      <div class="repo" id="repoPath">Loading repo</div>
      <nav>
        <a href="#overview">Overview</a>
        <a href="#reviews">Reviews</a>
        <a href="#agents">Agents</a>
        <a href="#actions">Actions</a>
      </nav>
    </aside>
    <main>
      <header id="overview">
        <div>
          <h1>Knowledge Repo Dashboard</h1>
          <div class="subtle" id="updatedAt">Loading current state</div>
        </div>
        <div class="actions">
          <button class="button" id="reloadButton" type="button">Refresh View</button>
          <button class="button primary" id="refreshRepoButton" type="button">Run Refresh</button>
        </div>
      </header>

      <div class="grid metrics" id="metrics"></div>

      <div class="layout">
        <div class="stack">
          <section id="reviews">
            <div class="section-head"><h2>Review Queue</h2><span class="status" id="doctorStatus">doctor</span></div>
            <div class="section-body" id="reviewTable"></div>
          </section>
          <section id="filePreview">
            <div class="section-head"><h2>File Preview</h2><span class="subtle" id="filePreviewSummary"></span></div>
            <div class="section-body" id="filePreviewBody"><div class="empty">Select a review to inspect its file.</div></div>
          </section>
          <section>
            <div class="section-head"><h2>Tasks</h2><span class="subtle" id="taskSummary"></span></div>
            <div class="section-body" id="taskTable"></div>
          </section>
          <section>
            <div class="section-head"><h2>Runs</h2><span class="subtle" id="runSummary"></span></div>
            <div class="section-body" id="runTable"></div>
          </section>
        </div>

        <div class="stack" id="actions">
          <section id="agents">
            <div class="section-head"><h2>Agents</h2><span class="subtle" id="agentSummary"></span></div>
            <div class="section-body" id="agentTable"></div>
          </section>
          <section>
            <div class="section-head"><h2>Bootstrap</h2></div>
            <div class="section-body">
              <form id="bootstrapForm">
                <label>Agents <textarea name="agents" placeholder="agent-a, agent-b"></textarea></label>
                <label>Limit <input name="limit" type="number" min="1" placeholder="3"></label>
                <button class="button primary" type="submit">Stage Work</button>
              </form>
            </div>
          </section>
          <section>
            <div class="section-head"><h2>Agent Launch</h2></div>
            <div class="section-body">
              <form id="launchForm">
                <label>Agents <textarea name="agents" placeholder="agent-a, agent-b"></textarea></label>
                <label>Command <textarea name="command" placeholder="codex exec --prompt {prompt}"></textarea></label>
                <button class="button primary" type="submit">Write Launcher</button>
              </form>
            </div>
          </section>
          <div class="toast" id="toast"></div>
        </div>
      </div>
    </main>
  </div>
  <script>
    const state = { busy: false };
    const $ = (id) => document.getElementById(id);
    const h = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const list = (value) => String(value ?? "").split(/[,\\n]/).map((item) => item.trim()).filter(Boolean);
    const setBusy = (busy) => {
      state.busy = busy;
      for (const button of document.querySelectorAll("button")) button.disabled = busy;
    };
    const toast = (message) => { $("toast").textContent = message; };

    async function api(path, options = {}) {
      const response = await fetch(path, {
        headers: { "content-type": "application/json" },
        ...options,
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error || (payload.messages || []).join("\\n") || "request failed");
      return payload;
    }

    async function load() {
      setBusy(true);
      try {
        const data = await api("/api/state");
        render(data);
        toast("Ready");
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    function render(data) {
      $("repoPath").textContent = data.repoPath;
      $("updatedAt").textContent = new Date(data.updatedAt).toLocaleString();
      const counts = data.dashboard?.counts || {};
      $("metrics").innerHTML = [
        ["Raw", counts.rawSources],
        ["Wiki", counts.wikiPages],
        ["Claims", counts.claims],
        ["Reviews", counts.reviews],
        ["Tasks", data.tasks?.total],
        ["Runs", data.runs?.total],
      ].map(([label, value]) => '<div class="metric"><strong>' + h(value ?? 0) + '</strong><span>' + h(label) + '</span></div>').join("");

      const doctorOk = data.doctor?.ok === true;
      $("doctorStatus").className = "status " + (doctorOk ? "ok" : "bad");
      $("doctorStatus").textContent = doctorOk ? "clean" : "needs review";
      renderReviews(data.reviews);
      renderTasks(data.tasks);
      renderRuns(data.runs);
      renderAgents(data.agents);
    }

    function renderReviews(reviews) {
      const items = reviews?.items || [];
      if (!items.length) {
        $("reviewTable").innerHTML = '<div class="empty">No reviews.</div>';
        return;
      }
      $("reviewTable").innerHTML = '<table><thead><tr><th>Priority</th><th>Review</th><th>Status</th><th>Kind</th><th>Next</th><th></th></tr></thead><tbody>' +
        items.map((item) => '<tr><td>' + h(item.priority) + '</td><td><code>' + h(item.file) + '</code><br>' + h(item.title) + '</td><td>' + badge(item.status) + '</td><td>' + h(item.kind) + '</td><td>' + h(item.nextAction) + '</td><td><button class="button small" type="button" data-open-file="' + h(item.file) + '">Open</button></td></tr>').join("") +
        '</tbody></table>';
      for (const button of document.querySelectorAll("[data-open-file]")) {
        button.addEventListener("click", () => openFile(button.getAttribute("data-open-file") || ""));
      }
    }

    async function openFile(file) {
      if (!file) return;
      setBusy(true);
      try {
        const payload = await api("/api/file?path=" + encodeURIComponent(file));
        $("filePreviewSummary").textContent = payload.truncated ? "truncated" : h(payload.size || 0) + " bytes";
        $("filePreviewBody").innerHTML =
          '<div class="viewer-meta"><code>' + h(payload.file) + '</code>' + (payload.truncated ? '<span class="status warn">truncated</span>' : '') + '</div>' +
          reviewActions(payload.file) +
          reviewContentEditor(payload.file, payload.content) +
          '<div class="viewer-grid"><pre>' + h(payload.inspect) + '</pre><pre>' + h(payload.content) + '</pre></div>' +
          '<div class="preview-output" id="applyPreview"></div>';
        bindReviewActions(payload.file);
        location.hash = "filePreview";
        toast("Opened " + payload.file);
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    function reviewActions(file) {
      if (!String(file || "").startsWith("reviews/")) return "";
      return '<div class="viewer-actions">' +
        '<button class="button small primary" type="button" data-review-status="accepted">Accept</button>' +
        '<button class="button small danger" type="button" data-review-status="rejected">Reject</button>' +
        '<button class="button small" type="button" data-review-status="proposed">Reopen</button>' +
        '<button class="button small" type="button" data-apply-preview="true">Apply Dry Run</button>' +
        '<button class="button small primary" type="button" data-apply-review="true">Apply Accepted Review</button>' +
        '</div>';
    }

    function reviewContentEditor(file, content) {
      if (!String(file || "").startsWith("reviews/")) return "";
      return '<form class="content-editor" id="reviewContentForm">' +
        '<label>Proposed Content<textarea name="content">' + h(proposedContentFromReview(content || "")) + '</textarea></label>' +
        '<button class="button small" type="submit">Save Proposed Content</button>' +
        '</form>';
    }

    function proposedContentFromReview(content) {
      const match = String(content || "").match(/^##\\s+Proposed Content\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)/m);
      if (!match) return "";
      const section = match[1].trim();
      const fence = String.fromCharCode(96).repeat(3);
      const fenced = section.match(new RegExp("^" + fence + "(?:markdown|md)?\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n" + fence + "\\\\s*$", "i"));
      return fenced ? fenced[1].trim() : "";
    }

    function bindReviewActions(file) {
      const form = $("reviewContentForm");
      if (form) {
        form.addEventListener("submit", (event) => saveReviewContent(event, file));
      }
      for (const button of document.querySelectorAll("[data-review-status]")) {
        button.addEventListener("click", () => updateReview(file, button.getAttribute("data-review-status") || ""));
      }
      for (const button of document.querySelectorAll("[data-apply-preview]")) {
        button.addEventListener("click", () => previewApply(file));
      }
      for (const button of document.querySelectorAll("[data-apply-review]")) {
        button.addEventListener("click", () => applyAcceptedReview(file));
      }
    }

    async function updateReview(file, status) {
      if (!file || !status) return;
      setBusy(true);
      try {
        const result = await api("/api/review-status", {
          method: "POST",
          body: JSON.stringify({ file, status, note: "Updated from kforge web dashboard." }),
        });
        await load();
        await openFile(file);
        toast("Review status: " + (result.payload?.previousStatus || "?") + " -> " + (result.payload?.status || status));
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    async function saveReviewContent(event, file) {
      event.preventDefault();
      if (!file) return;
      const form = new FormData(event.currentTarget);
      setBusy(true);
      try {
        await api("/api/review-content", {
          method: "POST",
          body: JSON.stringify({ file, content: String(form.get("content") || "") }),
        });
        await load();
        await openFile(file);
        toast("Proposed Content saved");
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    async function previewApply(file) {
      if (!file) return;
      setBusy(true);
      try {
        const result = await api("/api/review-apply-preview", {
          method: "POST",
          body: JSON.stringify({ file }),
        });
        const payload = result.payload || {};
        const preview = $("applyPreview");
        if (preview) {
          preview.innerHTML = '<div class="viewer-meta"><span class="status ok">dry run</span><code>' + h(payload.target || "") + '</code></div><pre>' + h(payload.content || result.messages?.join("\\n") || "") + '</pre>';
        }
        toast("Apply preview ready");
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    async function applyAcceptedReview(file) {
      if (!file) return;
      setBusy(true);
      try {
        const result = await api("/api/review-apply", {
          method: "POST",
          body: JSON.stringify({ file, note: "Applied from kforge web dashboard." }),
        });
        await load();
        await openFile(file);
        toast("Applied review to " + (result.payload?.target || "target"));
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    }

    function renderTasks(tasks) {
      const items = tasks?.items || [];
      $("taskSummary").textContent = (tasks?.showing ?? 0) + "/" + (tasks?.total ?? 0);
      if (!items.length) {
        $("taskTable").innerHTML = '<div class="empty">No tasks.</div>';
        return;
      }
      $("taskTable").innerHTML = '<table><thead><tr><th>Task</th><th>Status</th><th>Owner</th><th>Source</th></tr></thead><tbody>' +
        items.map((item) => '<tr><td><code>' + h(item.file) + '</code><br>' + h(item.title) + '</td><td>' + badge(item.status) + '</td><td>' + h(item.owner || "-") + '</td><td><code>' + h(item.source) + '</code></td></tr>').join("") +
        '</tbody></table>';
    }

    function renderRuns(runs) {
      const items = runs?.items || [];
      $("runSummary").textContent = (runs?.showing ?? 0) + "/" + (runs?.total ?? 0);
      if (!items.length) {
        $("runTable").innerHTML = '<div class="empty">No runs.</div>';
        return;
      }
      $("runTable").innerHTML = '<table><thead><tr><th>Run</th><th>Status</th><th>Agent</th><th>Logs</th></tr></thead><tbody>' +
        items.map((item) => '<tr><td><code>' + h(item.file) + '</code><br>' + h(item.title) + '</td><td>' + badge(item.status) + '</td><td>' + h(item.agent) + '</td><td>' + h(item.logCount) + '</td></tr>').join("") +
        '</tbody></table>';
    }

    function renderAgents(agents) {
      const items = agents?.agents || [];
      $("agentSummary").textContent = (agents?.counts?.agents ?? 0) + " active";
      if (!items.length) {
        $("agentTable").innerHTML = '<div class="empty">No active agents.</div>';
        return;
      }
      $("agentTable").innerHTML = '<table><thead><tr><th>Agent</th><th>Runs</th><th>Tasks</th></tr></thead><tbody>' +
        items.map((item) => '<tr><td>' + h(item.agent) + '</td><td>' + h((item.runningRuns || []).length) + '</td><td>' + h((item.claimedTasks || []).length) + '</td></tr>').join("") +
        '</tbody></table>';
    }

    function badge(status) {
      const value = h(status || "-");
      const cls = status === "success" || status === "done" || status === "applied" || status === "accepted" ? "ok" : status === "failure" ? "bad" : "warn";
      return '<span class="status ' + cls + '">' + value + '</span>';
    }

    $("reloadButton").addEventListener("click", load);
    $("refreshRepoButton").addEventListener("click", async () => {
      setBusy(true);
      try {
        await api("/api/refresh", { method: "POST", body: "{}" });
        await load();
        toast("Repo refreshed");
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    });
    $("bootstrapForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setBusy(true);
      try {
        await api("/api/bootstrap", {
          method: "POST",
          body: JSON.stringify({
            agents: list(form.get("agents")),
            limit: Number(form.get("limit")) || undefined,
          }),
        });
        await load();
        toast("Bootstrap staged");
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    });
    $("launchForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setBusy(true);
      try {
        const result = await api("/api/agent-launch", {
          method: "POST",
          body: JSON.stringify({
            agents: list(form.get("agents")),
            command: String(form.get("command") || ""),
          }),
        });
        await load();
        toast("Launcher written: " + (result.payload?.script?.file || "runs/"));
      } catch (error) {
        toast(error.message || String(error));
      } finally {
        setBusy(false);
      }
    });
    load();
  </script>
</body>
</html>`;
}
