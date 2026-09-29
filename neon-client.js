import { createClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

export function hasNeonConfig(config) {
  return Boolean(config?.neonAuthUrl?.trim() && config?.neonDataApiUrl?.trim());
}

export function createCigAppNeonClient(config) {
  if (!hasNeonConfig(config)) return null;

  return createClient({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: config.neonAuthUrl,
      allowAnonymous: false,
    },
    dataApi: {
      url: config.neonDataApiUrl,
      options: { db: { schema: "public" } },
    },
  });
}

export const neonClient = createCigAppNeonClient(window.CIGAPP_CONFIG);
