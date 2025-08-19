# @mobtakronio/schemakit-client

Framework-agnostic, plug-and-play REST client for SchemaKit backends. Works in React, Vue, Next.js, Nuxt, or plain TypeScript. SSR-ready and zero framework dependencies.

## Quick start

```ts
import { createSchemaKitClient } from '@mobtakronio/schemakit-client';

const client = createSchemaKitClient({
  baseUrl: '/api',
  tenantId: 'acme',
  getAuthHeaders: () => ({ Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` })
});

const User = client.entity<'User'>('User');
const users = await User.list({ page: 1, limit: 20 });
```

## API

- createSchemaKitClient(options)
- client.entity(name).{ list, get, create, update, delete }
- client.view(entityName, viewName).run(params)
- client.request({ method, path, query?, body? })
- client.with(overrides)

See source for full options.
