import { router } from "./router.ts";
import { receive } from "./receive.ts";
import { Status } from "./deps.ts";

addEventListener("fetch", (e: any) => {
  e.respondWith(
    router({
      "/receive": receive,
    }, () => new Response(undefined, { status: Status.NotFound }))(e.request),
  );
});
