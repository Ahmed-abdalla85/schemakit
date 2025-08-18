import { createSchemaKitClient } from '@mobtakronio/schemakit-client';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const client = createSchemaKitClient({
    baseUrl: config.public.apiBaseUrl,
    tenantId: config.public.tenantId,
    headers: () => {
      try {
        const cookie = process.server ? useRequestHeaders(['cookie']).cookie : document.cookie;
        return cookie ? { cookie } : {};
      } catch {
        return {};
      }
    }
  });

  return { provide: { schemakit: client } };
});
