import { MatchResult } from "./deps.ts";
import { hmac, Status } from "./deps.ts";

export async function receive(
  req: Request,
  match: MatchResult,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(undefined, {
      status: Status.MethodNotAllowed,
    });
  }

  const sig = req.headers.get("X-Hub-Signature-256");
  if (!sig) {
    return new Response(undefined, {
      status: Status.Unauthorized,
    });
  }

  const body = new Uint8Array(await req.arrayBuffer());
  const calc = hmac("sha256", Deno.env.get("GITHUB_WEBHOOK_SECRET")!, body);
  if ("sha256=" + calc.hex() !== sig) {
    return new Response(undefined, {
      status: Status.InternalServerError,
    });
  }

  const name = req.headers.get("X-GitHub-Event")!;

  // get registered webhooks

  const regs: { url: string; secret: string }[] = [{
    url:
      "https://discord.com/api/webhooks/825864570848542741/_1Mq4VJXtLfEAdqSAra5nxJwznBAJaWBZoFw1kWya4K1yGuoGTt8Al9aAIfazyljZWhN/github",
    secret: "foo",
  }];

  let x = await Promise.all(regs.map((reg) => {
    return fetch(reg.url, {
      method: "POST",
      headers: {
        "X-GitHub-Event": name,
        "X-Proxy-Signature": hmac("sha256", reg.secret, body).hex(),
        "Content-Type": "application/json",
      },
      body,
    });
  }));

  for (const x1 of x) {
    console.log(x1, await x1.json());
  }

  return new Response(undefined, {
    status: Status.Accepted,
  });
}
