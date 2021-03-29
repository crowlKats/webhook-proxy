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
  console.log(sig, calc.hex());
  if ("sha256=" + calc.toString() !== sig) {
    return new Response(undefined, {
      status: Status.InternalServerError,
    });
  }

  const name = req.headers.get("X-GitHub-Event")!;

  // get registered webhooks

  const regs: { url: string; secret: string }[] = [{
    url:
      "https://discord.com/api/webhooks/825864570848542741/_1Mq4VJXtLfEAdqSAra5nxJwznBAJaWBZoFw1kWya4K1yGuoGTt8Al9aAIfazyljZWhN",
    secret: "foo",
  }];

  for (const reg of regs) {
    fetch(reg.url, {
      method: "POST",
      headers: {
        "X-GitHub-Event": name,
        "X-Proxy-Signature": hmac("sha256", reg.secret, body).toString(),
      },
      body,
    });
  }

  return new Response();
}
