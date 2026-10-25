import "server-only";
import { cookies } from "next/headers";
import { config } from "./config";
import { normalizeRegion, REGION_COOKIE } from "./regions";

export async function getRegion(): Promise<string> {
  const jar = await cookies();
  return normalizeRegion(jar.get(REGION_COOKIE)?.value, config.defaultRegion);
}
