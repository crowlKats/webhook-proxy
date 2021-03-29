import {
  DynamoDBClient,
  GetItemCommand,
  hmac,
  MatchResult,
  Status,
} from "./deps.ts";

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

  const body = new Uint8Array(await req.clone().arrayBuffer());
  const jsonBody = await req.json();
  const calc = hmac("sha256", Deno.env.get("GITHUB_WEBHOOK_SECRET")!, body);
  if ("sha256=" + calc.hex() !== sig) {
    return new Response(undefined, {
      status: Status.InternalServerError,
    });
  }

  if (jsonBody.repository?.name === undefined) {
    return new Response(undefined, {
      status: Status.Accepted,
    });
  }

  const client = new DynamoDBClient({
    region: "ap-south-1",
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY"),
      secretAccessKey: Deno.env.get("AWS_SECRET_KEY"),
    },
  });

  const { Item } = await client.send(
    new GetItemCommand({
      TableName: "Proxies",
      Key: {
        repoName: { S: jsonBody.repository.name },
      },
    }),
  );
  const { proxies }: {
    proxies: { L: { url: { S: string }; secret: { S: string } }[] };
  } = Item;

  await Promise.all(proxies.L.map((reg) => {
    return fetch(reg.url.S, {
      method: "POST",
      headers: {
        "X-GitHub-Event": req.headers.get("X-GitHub-Event")!,
        "X-Proxy-Signature": hmac("sha256", reg.secret.S, body).hex(),
        "Content-Type": "application/json",
      },
      body,
    });
  }));

  return new Response(undefined, {
    status: Status.Accepted,
  });
}
