import { createSchemaKitClient } from '@mobtakronio/schemakit-client';

export default defineNuxtPlugin(() => {
  console.log('SchemaKit plugin loading...');
  
  const config = useRuntimeConfig();
  console.log('Config:', config.public);

  const client = createSchemaKitClient({
    baseUrl: config.public.apiBaseUrl,
    tenantId: config.public.tenantId,
    headers: () => {
      try {
        const cookie = document.cookie;
        return cookie ? { cookie } : {};
      } catch {
        return {};
      }
    }
  });

  console.log('SchemaKit client created:', client);
  
  return {
    provide: {
      schemakit: client
    }
  };
});
