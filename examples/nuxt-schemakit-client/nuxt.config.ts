export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
      tenantId: process.env.NUXT_PUBLIC_TENANT_ID || 'system'
    }
  },
  nitro: {
    preset: 'node-server'
  },
  typescript: {
    strict: true
  }
});
