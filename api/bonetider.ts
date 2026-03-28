const BONETIDER_URL =
  "https://www.islamiskaforbundet.se/wp-content/plugins/bonetider/Bonetider_Widget.php";

type VercelReq = {
  method?: string;
  body?: string | Record<string, string>;
};

type VercelRes = {
  status: (code: number) => VercelRes;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

export default async function handler(
  req: VercelReq,
  res: VercelRes
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  let bodyString: string;
  if (typeof req.body === "string") {
    bodyString = req.body;
  } else if (req.body && typeof req.body === "object") {
    bodyString = new URLSearchParams(
      req.body as Record<string, string>
    ).toString();
  } else {
    res.status(400).send("Bad Request");
    return;
  }

  const upstream = await fetch(BONETIDER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyString,
  });

  const text = await upstream.text();
  res
    .status(upstream.status)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(text);
}
