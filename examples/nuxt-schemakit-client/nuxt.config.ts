export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '/api',
      tenantId: process.env.NUXT_PUBLIC_TENANT_ID || 'acme'
    }
  },
  nitro: {
    preset: 'node-server'
  },
  typescript: {
    strict: true
  }
});
