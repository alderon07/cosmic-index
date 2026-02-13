import { ApiReference } from "@scalar/nextjs-api-reference";

const apiDocsHandler = ApiReference({
  url: "/openapi.json",
  theme: "deepSpace",
  darkMode: true,
  metaData: {
    title: "Cosmic Index API Reference",
  },
});

const ROBOT_HEADER = "noindex, nofollow";

function blockedResponse() {
  return Response.json(
    { error: "not_found" },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": ROBOT_HEADER,
      },
    }
  );
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return blockedResponse();
  }

  const response = await apiDocsHandler(request);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", ROBOT_HEADER);
  return response;
}
