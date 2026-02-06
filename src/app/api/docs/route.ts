import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/openapi.json",
  theme: "deepSpace",
  darkMode: true,
  metaData: {
    title: "Cosmic Index API Reference",
  },
});
