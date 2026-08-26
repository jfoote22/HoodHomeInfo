// AI agent backend for the wall dashboard.
//
// Uses xAI's Responses API with the built-in `web_search` tool, so Grok can answer
// anything - local questions grounded in the dashboard's live weather / tide / sighting
// data, AND general or current-events questions by searching the web. Answers come back
// in the text-stream format the Vercel AI SDK `useChat` hook on the client expects.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const XAI_URL = "https://api.x.ai/v1/responses";
const DEFAULT_MODEL = process.env.GROK_MODEL || "grok-4-latest";

const BASE_INSTRUCTIONS = `You are the household AI assistant shown on a wall-mounted TV dashboard in a waterfront home in Union, Washington, on Hood Canal (the western fjord of Puget Sound, Mason County). The people asking are the residents and their guests.

You can answer ANY question - local or not. Use the web_search tool whenever a question needs current, recent, or specific factual information (news, sports scores, prices, business hours, events, "what's happening", anything after your training data). Do not tell the user you can't access the internet; search instead.

Local knowledge to keep in mind: Union sits at the Great Bend of Hood Canal near Alderbrook Resort; nearby towns are Hoodsport, Belfair, Allyn, Shelton, Brinnon, Seabeck and Bremerton; the area is known for oysters, clams, shrimp, salmon, kayaking, Olympic National Park/Forest, the Hood Canal Bridge, and whale sightings (Bigg's/transient orcas, southern resident J/K/L pods, gray and humpback whales, harbor porpoises). Tides here are large (two highs, two lows a day) and matter for shellfishing and boating.

Style for a TV screen: lead with the answer. Default to 2-4 short sentences; go longer only when the question clearly needs it (a recipe, a list of options, step-by-step directions). Plain text only - no markdown headers, bullets are OK, no bold, and do not paste raw URLs into the body; the system will show your sources separately. When the live conditions below answer the question, use them as ground truth instead of searching.`;

interface ClientMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Strip markdown that would render as literal symbols on the dashboard card. */
function cleanForDisplay(text: string): string {
  return text
    .replace(/\[\[\d+\]\]\((https?:\/\/[^)]+)\)/g, "") // [[1]](url) citations
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1") // [label](url)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const apiKey = (process.env.GROK_API || process.env.GROK_API_KEY || process.env.XAI_API_KEY || "").trim();
    if (!apiKey || /^your_/i.test(apiKey)) {
      return new Response(
        JSON.stringify({
          error:
            "Missing Grok API key. Set GROK_API (locally in .env.local; on Vercel: Settings > Environment Variables, Production, then redeploy). See /api/status/env for which keys this deployment can see.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const messages: ClientMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const liveContext = typeof body?.context === "string" && body.context.trim() ? body.context.trim() : null;
    const eventsContext = typeof body?.events === "string" && body.events.trim() ? body.events.trim().slice(0, 12000) : null;
    const webSearch = body?.webSearch !== false; // on unless the client opts out

    const clientSystem = messages.find((m) => m.role === "system")?.content;
    const instructions = [
      clientSystem || BASE_INSTRUCTIONS,
      liveContext
        ? `LIVE CONDITIONS RIGHT NOW (from the dashboard's weather, NOAA tide, and whale-sighting feeds - treat as ground truth):\n${liveContext}`
        : null,
      eventsContext
        ? `EVENTS ON THE DASHBOARD (the household's own Google Calendar, then the local listings the dashboard shows - treat as ground truth and answer questions about plans, dates, and what's happening nearby from this list before searching the web):\n${eventsContext}`
        : null,
      `Current date/time in Union, WA: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "full", timeStyle: "short" })}.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Keep the last few turns so follow-up questions work; drop system entries.
    const input = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({ role: m.role, content: String(m.content ?? "") }));

    if (input.length === 0 || input[input.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "No user message" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const payload: Record<string, unknown> = {
      model: DEFAULT_MODEL,
      instructions,
      input,
      temperature: 0.5,
      max_output_tokens: 1200,
      store: false,
    };
    if (webSearch) payload.tools = [{ type: "web_search" }];

    let data: any = null;
    let lastError: Error = new Error("Unknown error");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(XAI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(50000),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`xAI ${res.status}: ${errText.slice(0, 300)}`);
        }
        data = await res.json();
        break;
      } catch (err) {
        lastError = err as Error;
        console.error(`xAI attempt ${attempt + 1} failed:`, err);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }
    if (!data) throw lastError;

    // Pull the assistant text + any url citations out of the Responses payload.
    const messageItems: any[] = (data.output || []).filter((o: any) => o?.type === "message");
    const parts: string[] = [];
    const sources: string[] = [];
    for (const item of messageItems) {
      for (const c of item.content || []) {
        if (c?.type === "output_text" && typeof c.text === "string") parts.push(c.text);
        for (const a of c?.annotations || []) {
          if (a?.type === "url_citation" && a.url) sources.push(String(a.url));
        }
      }
    }
    for (const c of data.citations || []) if (typeof c === "string") sources.push(c);

    let content = cleanForDisplay(parts.join("\n\n")) || "I didn't get a usable answer back. Please try again.";
    const uniqueHosts = Array.from(new Set(sources.map(hostOf))).slice(0, 3);
    if (uniqueHosts.length) content += `\n\nSources: ${uniqueHosts.join(" · ")}`;

    // Stream the finished answer in the AI SDK text-stream protocol ("0:<json string>\n")
    // in small chunks so the card fills in naturally instead of popping in at once.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = content.match(/[\s\S]{1,6}/g) || [content];
        let i = 0;
        const push = () => {
          if (i >= chunks.length) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunks[i])}\n`));
          i++;
          setTimeout(push, 12);
        };
        push();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache",
        "X-Grok-Model": String(data.model || DEFAULT_MODEL),
        "X-Grok-Web-Searches": String(data?.usage?.server_side_tool_usage_details?.web_search_calls ?? 0),
      },
    });
  } catch (error) {
    console.error("Grok route error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    const timedOut = /timeout|TimeoutError|aborted/i.test(msg);
    return new Response(JSON.stringify({ error: timedOut ? "The AI took too long to answer. Please try again." : `Error connecting to Grok: ${msg}` }), {
      status: timedOut ? 408 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
