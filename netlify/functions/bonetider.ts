const BONETIDER_URL =
  "https://www.islamiskaforbundet.se/wp-content/plugins/bonetider/Bonetider_Widget.php";

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
  isBase64Encoded?: boolean;
};

type NetlifyResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function decodeBody(event: NetlifyEvent): string {
  if (!event.body) return "";
  if (!event.isBase64Encoded) return event.body;
  return Buffer.from(event.body, "base64").toString("utf8");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: "Method Not Allowed",
    };
  }

  const body = decodeBody(event);
  const commonInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (compatible; CallToPrayerSweden/1.0; +https://www.islamiskaforbundet.se/)",
      Origin: "https://www.islamiskaforbundet.se",
      Referer: "https://www.islamiskaforbundet.se/",
    },
    body,
  };

  try {
    let upstream: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      upstream = await fetchWithTimeout(BONETIDER_URL, commonInit, 9000);
      if (upstream.ok) break;
      if (upstream.status < 500) break;
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }

    if (!upstream) {
      return {
        statusCode: 503,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ error: "UPSTREAM_UNAVAILABLE" }),
      };
    }

    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: text,
    };
  } catch {
    return {
      statusCode: 503,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: "UPSTREAM_TIMEOUT_OR_NETWORK" }),
    };
  }
};
