import { setTimeout as delay } from "node:timers/promises";
import { fetch, EnvHttpProxyAgent } from "undici";

const dispatcher = new EnvHttpProxyAgent();
const transient = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
export async function publicFetch(
  url: string,
  options: NonNullable<Parameters<typeof fetch>[1]> = {},
  timeout = 20000,
  retries = 2,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        dispatcher,
        redirect: "error",
        signal: AbortSignal.timeout(timeout),
      });
      if (response.status < 500 || attempt >= retries) return response;
      await response.body?.cancel();
    } catch (error) {
      const cause =
        error instanceof Error
          ? (error.cause as { code?: string } | undefined)
          : undefined;
      if (
        attempt >= retries ||
        (!transient.has(cause?.code ?? "") &&
          !(error instanceof Error && error.name === "TimeoutError"))
      )
        throw error;
    }
    await delay((attempt + 1) * 500);
  }
}
