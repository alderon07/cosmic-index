// SSD's fair-use policy permits one request at a time. Share this queue across
// SBDB and CNEOS callers in each server process, including response body reads.
let previousRequest: Promise<void> = Promise.resolve();

export async function fetchJpl(url: string, init: RequestInit): Promise<Response> {
  const signal = init.signal;
  signal?.throwIfAborted();
  const request = previousRequest.then(async () => {
    signal?.throwIfAborted();
    const headers = new Headers(init.headers);
    headers.set("User-Agent", "cosmic-index/1.0 (https://cosmicindex.dev)");
    const response = await fetch(url, { ...init, headers, cache: "no-store" });
    // Keep the deadline and queue slot active through the response body. Parsing
    // then reads this buffered response locally. An aborted waiter never releases
    // the preceding request's slot or starts its own network request.
    const body = await response.text();
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  });
  previousRequest = request.then(() => {}, () => {});
  if (!signal) return request;
  return new Promise<Response>((resolve, reject) => {
    const cancel = () => { signal.removeEventListener("abort", cancel); reject(signal.reason); };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    request.then((response) => { signal.removeEventListener("abort", cancel); resolve(response); },
      (error: unknown) => { signal.removeEventListener("abort", cancel); reject(error); });
  });
}
