# Nuxt 3 + SchemaKit Client Example

This example shows how to use `@mobtakronio/schemakit-client` in a Nuxt 3 app with SSR support.

## Setup

- Ensure you built the workspace packages:

```bash
pnpm -w -F @mobtakronio/schemakit-client build
```

- Run this example locally:

```bash
cd examples/nuxt-schemakit-client
pnpm install
pnpm dev
```

Set `NUXT_PUBLIC_API_BASE_URL` to point to your backend (defaults to `/api`).

## Highlights

- Client is provided via a Nuxt plugin with SSR-friendly headers forwarding
- Usage via `useAsyncData` for SSR and SEO
- Works client-only too via `onMounted`
