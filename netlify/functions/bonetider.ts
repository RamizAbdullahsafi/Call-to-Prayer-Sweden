const BONETIDER_URL =
  "https://www.islamiskaforbundet.se/wp-content/plugins/bonetider/Bonetider_Widget.php";

type NetlifyEvent = {
  httpMethod: string;
  body: string | null;
};

type NetlifyResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export const handler = async (event: NetlifyEvent): Promise<NetlifyResult> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Method Not Allowed",
    };
  }

  const upstream = await fetch(BONETIDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: event.body ?? "",
  });

  const text = await upstream.text();
  return {
    statusCode: upstream.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: text,
  };
};
