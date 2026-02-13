import openApiSpec from "@/lib/openapi/openapi.json";

const ROBOT_HEADER = "noindex, nofollow";
const SPEC_PAYLOAD = JSON.stringify(openApiSpec);

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

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return blockedResponse();
  }

  return new Response(SPEC_PAYLOAD, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": ROBOT_HEADER,
    },
  });
}
