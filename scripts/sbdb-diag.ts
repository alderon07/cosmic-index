#!/usr/bin/env npx tsx
/**
 * Diagnostic script for JPL SBDB API
 * Usage: pnpm sbdb:diag <query> [--param sb-name|sb-cdata|sstr]
 *
 * Examples:
 *   pnpm sbdb:diag halley
 *   pnpm sbdb:diag halley --param sb-name
 *   pnpm sbdb:diag ceres --param sstr
 */

const QUERY_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";
const LOOKUP_API_URL = "https://ssd-api.jpl.nasa.gov/sbdb.api";

interface DiagOptions {
  query: string;
  paramType: "sb-cdata" | "sb-name" | "sstr";
}

function parseArgs(): DiagOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
JPL SBDB Diagnostic Tool

Usage: pnpm sbdb:diag <query> [options]

Options:
  --param <type>  Search parameter type (sb-cdata, sb-name, sstr)
                  Default: sb-cdata (uses regex matching)

Examples:
  pnpm sbdb:diag halley              # Search using sb-cdata (regex)
  pnpm sbdb:diag halley --param sb-name   # Search using sb-name wildcard
  pnpm sbdb:diag halley --param sstr      # Search using lookup API sstr
  pnpm sbdb:diag ceres
  pnpm sbdb:diag "2024 MN"
`);
    process.exit(0);
  }

  const query = args[0];
  let paramType: "sb-cdata" | "sb-name" | "sstr" = "sb-cdata";

  const paramIndex = args.indexOf("--param");
  if (paramIndex !== -1 && args[paramIndex + 1]) {
    const param = args[paramIndex + 1];
    if (param === "sb-name" || param === "sb-cdata" || param === "sstr") {
      paramType = param;
    } else {
      console.error(`Invalid param type: ${param}. Use sb-cdata, sb-name, or sstr`);
      process.exit(1);
    }
  }

  return { query, paramType };
}

function buildQueryUrl(query: string, paramType: "sb-cdata" | "sb-name"): string {
  const url = new URL(QUERY_API_URL);

  // Required fields
  url.searchParams.set("fields", "spkid,full_name,kind,pdes,name,neo,pha,class,diameter,H");

  if (paramType === "sb-cdata") {
    // Use regex-based constraint
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const constraint = JSON.stringify({
      OR: [
        `name|RE|.*${escapedQuery}.*`,
        `full_name|RE|.*${escapedQuery}.*`,
        `pdes|RE|.*${escapedQuery}.*`,
      ],
    });
    url.searchParams.set("sb-cdata", constraint);
  } else {
    // Use simple wildcard matching
    url.searchParams.set("sb-name", `*${query}*`);
  }

  url.searchParams.set("limit", "10");

  return url.toString();
}

function buildLookupUrl(query: string): string {
  const url = new URL(LOOKUP_API_URL);
  url.searchParams.set("sstr", query);
  return url.toString();
}

async function diagnose(options: DiagOptions): Promise<void> {
  const { query, paramType } = options;

  console.log("=".repeat(60));
  console.log("JPL SBDB Diagnostic");
  console.log("=".repeat(60));
  console.log(`Query: "${query}"`);
  console.log(`Param Type: ${paramType}`);
  console.log("-".repeat(60));

  let url: string;
  let apiType: string;

  if (paramType === "sstr") {
    url = buildLookupUrl(query);
    apiType = "Lookup API (sbdb.api)";
  } else {
    url = buildQueryUrl(query, paramType);
    apiType = "Query API (sbdb_query.api)";
  }

  console.log(`API: ${apiType}`);
  console.log(`URL: ${url}`);
  console.log("-".repeat(60));

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    const latencyMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type");

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}`);
    console.log(`Latency: ${latencyMs}ms`);
    console.log("-".repeat(60));

    const text = await response.text();

    if (!response.ok) {
      console.log("ERROR Response:");
      console.log(text.substring(0, 500));
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("Failed to parse JSON. Raw response (first 500 chars):");
      console.log(text.substring(0, 500));
      return;
    }

    if (paramType === "sstr") {
      // Lookup API response
      const lookupData = data as { object?: { fullname?: string; name?: string }; message?: string };
      if (lookupData.message) {
        console.log(`Message: ${lookupData.message}`);
      } else if (lookupData.object) {
        console.log("Found object:");
        console.log(`  Full Name: ${lookupData.object.fullname}`);
        console.log(`  Name: ${lookupData.object.name}`);
      }
    } else {
      // Query API response
      const queryData = data as { count?: string; data?: unknown[][]; fields?: string[] };
      console.log(`Count: ${queryData.count || "N/A"}`);
      console.log(`Fields: ${queryData.fields?.join(", ") || "N/A"}`);

      if (queryData.data && queryData.data.length > 0) {
        console.log(`\nResults (first ${Math.min(5, queryData.data.length)}):`);
        const fields = queryData.fields || [];
        const nameIdx = fields.indexOf("name");
        const fullNameIdx = fields.indexOf("full_name");
        const pdesIdx = fields.indexOf("pdes");

        queryData.data.slice(0, 5).forEach((row, i) => {
          const name = nameIdx >= 0 ? row[nameIdx] : null;
          const fullName = fullNameIdx >= 0 ? row[fullNameIdx] : null;
          const pdes = pdesIdx >= 0 ? row[pdesIdx] : null;
          console.log(`  ${i + 1}. ${name || fullName || pdes || "Unknown"}`);
        });

        if (queryData.data.length > 5) {
          console.log(`  ... and ${queryData.data.length - 5} more`);
        }
      } else {
        console.log("\nNo results found.");
      }
    }

    console.log("-".repeat(60));
    console.log("Response (first 300 chars):");
    console.log(text.substring(0, 300));
  } catch (error) {
    console.log(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log("=".repeat(60));
}

// Run the diagnostic
const options = parseArgs();
diagnose(options).catch(console.error);
