import { getFeatureRetiredResponse } from "@/lib/pro-access";

export async function GET() {
  return getFeatureRetiredResponse("waitlist");
}
