import type { SchemaKitClient } from '@mobtakronio/schemakit-client';

declare module '#app' {
  interface NuxtApp {
    $schemakit: SchemaKitClient;
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $schemakit: SchemaKitClient;
  }
}
export {};
