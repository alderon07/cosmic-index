import { getFeatureRetiredResponse } from "@/lib/pro-access";

export async function POST() {
  return getFeatureRetiredResponse("waitlist");
}
