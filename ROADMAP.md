## SchemaKit Architecture Assessment, Concerns, and Action Plan

### Executive summary
The project has a solid modular architecture: core engine (`@mobtakronio/schemakit`), transport-agnostic helpers (`@mobtakronio/schemakit-api`), and a framework adapter (`@mobtakronio/schemakit-elysia`). Types are well-structured, and examples plus tests give a good baseline. The most impactful improvements now are: make the DB query builder stateless (or ensure isolation), move to server-side pagination, harden permission/RLS enforcement, and introduce proper migrations with engine-specific DDL.

---

### Key concerns (shortlist)
- Stateful query builder in `packages/schemakit/src/database/db.ts` can leak state between operations; concurrent metadata loading risks cross-contamination.
- Client-side pagination across list endpoints; does not scale and can skew results.
- Permissions/RLS path lenient in places; enforcement partially commented or minimal.
- Sanitization was duplicated across layers; centralize to reduce drift and ensure consistent safety.
- Schema vs runtime: current `sql/schema.sql` is engine-agnostic; production commonly uses Postgres and needs UUID/timestamp/jsonb types and the `system` schema.
- Migrations: raw SQL split by semicolons is brittle; no versioning/upgrade path.
- Observability: limited structured logging and latency metrics; harder to debug in prod.

---

### Near-term action plan (2–3 weeks)
1) Query builder isolation (high priority)
   - Refactor `DB` to use immutable builder objects (fluent returns a new builder instance per call) or encapsulate per-query state in a detachable builder.
   - Add unit tests proving no state leakage across interleaved queries.

2) Server-side pagination everywhere
   - Implement pagination in `entity.get()` and in views: `limit`, `offset`, and `count` via adapter.
   - Update `@mobtakronio/schemakit-api` list operations to request server-side paginated results.
   - Update tests to assert correct totals and pages.

3) Permissions/RLS enforcement
   - Enforce permission checks consistently in `entities/entity.ts` for create/read/update/delete.
   - Add RLS integration in queries (basic role/user filters) and tests for deny/allow paths.

4) Centralize sanitization
   - Create a shared utility (e.g., `packages/schemakit/src/utils/sanitization.ts`) for:
     - Identifier validation (`/^[A-Za-z_][A-Za-z0-9_]*$/`).
     - Payload key sanitization.
     - Filter key sanitization.
   - Replace duplicates in `schemakit-api` and `schemakit-elysia` to use these shared functions.

5) E2E improvements
   - Keep `examples/elysia-basic/e2e.smoke.test.ts` and add a Postgres CI job.
   - Add a basic create/update/delete round-trip test for a sample entity.

---

### Roadmap (medium term)
1) Migrations and engine-specific DDL (Postgres-first)
   - Provide Postgres DDL (UUID, TIMESTAMP, JSONB, `"system"` schema) alongside the generic SQL.
   - Introduce a migration strategy (e.g., Drizzle Kit/Umzug/custom) with versioned migrations.
   - Add scripts: install, migrate, seed per adapter/tenant.

2) Query features and performance
   - Rich filter operators (eq, neq, gt/gte, lt/lte, like/ilike, in/nin, ranges, null checks).
   - Efficient counts (adapter-level count implementations).
   - View joins with aliasing support once DB abstraction supports JOINs safely.

3) Observability and diagnostics
   - Pluggable logger in core; structured logs with operation, tenant, timings.
   - Optional OpenTelemetry hooks for traces.
   - Standardized error mapping at boundaries (`schemakit-api`, adapters).

4) Multi-tenancy hardening
   - Strengthen invariants for all strategies (`schema`, `table-prefix`, `column`).
   - Ensure tenant-aware installs/migrations and entity cache segmentation.
   - Add tests per strategy.

5) Adapters and docs
   - Add additional adapters (Express/Fastify) reusing `@mobtakronio/schemakit-api`.
   - Expand Swagger docs: filter key patterns, sort specs, view usage, examples.

---

### Detailed tasks backlog
- DB builder
  - [ ] Convert builder to immutable or provide a separate `DBQuery` object created by `db.select()`.
  - [ ] Add tests for interleaved queries without state bleed.

- Server-side pagination
  - [ ] Update core DB adapter interface to accept pagination in `select`.
  - [ ] Update `Entity.get()` and `ViewManager.executeView()` to pass limit/offset and use adapter `count`.
  - [ ] Update `@mobtakronio/schemakit-api` and Elysia adapter to expect paginated payloads.

- Permissions/RLS
  - [ ] Enforce permission checks (deny by default if no matching rule).
  - [ ] Add RLS conditions to all reads (and optionally writes) based on context roles.
  - [ ] Tests for allowed/denied and exposed conditions.

- Sanitization
  - [ ] Create `utils/sanitization.ts` and move all identifier/payload sanitization there.
  - [ ] Replace custom code in `schemakit-api` and `schemakit-elysia` with shared functions.

- Migrations & schema
  - [ ] Provide Postgres DDL for system tables with correct types and schema.
  - [ ] Add migration scripts and a simple CLI (install/migrate/seed per tenant).

- Observability
  - [ ] Introduce minimal structured logger and measure timings around DB operations.
  - [ ] Optional OpenTelemetry instrumentation.

- CI/CD & Release
  - [ ] Add a CI pipeline: lint, unit tests, Postgres e2e, typecheck, build.
  - [ ] Use Changesets or semantic-release to automate versioning and changelogs.

---

### Open questions / decisions to make
- Should the core mandate server-side pagination for all adapters (breaking change), or keep a compatibility flag?
- Preferred migration tool (Drizzle Kit vs Umzug vs custom)?
- Minimum supported DB engines and prioritized features (Postgres-first?).
- Default multi-tenancy strategy for production (schema vs column)?

---

### References (current relevant files)
- Core DB/query builder: `packages/schemakit/src/database/db.ts`
- Entities: `packages/schemakit/src/entities/entity/entity.ts`
- Views: `packages/schemakit/src/entities/views/view-manager.ts`, types in `packages/schemakit/src/types/views/views.ts`
- API helpers: `packages/schemakit-api/src/crud.ts`, `packages/schemakit-api/src/helpers.ts`
- Elysia adapter: `packages/schemakit-elysia/src/plugin.ts`, `packages/schemakit-elysia/src/utils.ts`
- Example e2e: `examples/elysia-basic/e2e.smoke.test.ts`


