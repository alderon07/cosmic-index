import { getAdsenseConfig, getAdsTxtLine } from "@/lib/adsense";

export const revalidate = 3600;

export function GET(): Response {
  const { clientId } = getAdsenseConfig();
  const record = getAdsTxtLine(clientId);

  if (!record) {
    return new Response("Not Found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  return new Response(`${record}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
