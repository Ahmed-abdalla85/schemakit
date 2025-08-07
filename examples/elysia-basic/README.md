# SchemaKit + Elysia Example

This example demonstrates how to use SchemaKit with Elysia to create a dynamic REST API with runtime-defined entities.

## Features

- 🚀 Dynamic entity creation at runtime
- 🔐 Built-in authentication and permissions
- 📚 Auto-generated OpenAPI documentation
- 🗄️ Support for multiple databases (SQLite, PostgreSQL)
- 🎯 Type-safe with TypeScript

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- PostgreSQL (optional, for PostgreSQL adapter)

## Installation

### Option 1: Install from workspace root (Recommended)

```bash
# From the workspace root
cd ../.. # Go to workspace root
bun install

# Then navigate to the example
cd examples/elysia-basic
```

### Option 2: Install from example directory

```bash
# From the example directory
bun install
```

**Note:** If you get workspace dependency errors, use Option 1 or ensure you're in a properly configured monorepo workspace.

## Running the Example

### Using SQLite (Default)

```bash
# Run with SQLite (creates a local demo.sqlite file)
bun run dev

# Or specify explicitly
bun run dev:sqlite
```

### Using PostgreSQL

```bash
# Make sure PostgreSQL is running, then:
bun run dev:postgres

# Or with custom connection settings:
DB_HOST=localhost \
DB_PORT=5432 \
DB_USER=postgres \
DB_PASSWORD=yourpassword \
DB_NAME=schemakit_demo \
bun run dev:postgres
```

## Environment Variables

- `DB_TYPE` - Database type: `sqlite` or `postgres` (default: `sqlite`)
- `DB_FILE` - SQLite database file path (default: `./demo.sqlite`)
- `DB_HOST` - PostgreSQL host (default: `localhost`)
- `DB_PORT` - PostgreSQL port (default: `5432`)
- `DB_USER` - PostgreSQL user (default: `postgres`)
- `DB_PASSWORD` - PostgreSQL password (default: `postgrespassword`)
- `DB_NAME` - PostgreSQL database name (default: `schemakit_demo`)
- `PORT` - Server port (default: `3000`)

## API Endpoints

Once running, the following endpoints are available:

- `GET /` - Welcome page with API information
- `GET /health` - Health check endpoint
- `GET /docs` - Swagger UI documentation
- `GET /api/entities` - List all entities
- `GET /api/entity/{entity}` - CRUD operations for entities

## Example Entities

The demo automatically creates two entities:

### Users Entity
- Fields: `name`, `email`, `role`, `is_active`, `profile` (JSON)
- Permissions: Admin can do everything, users can read and create

### Posts Entity
- Fields: `title`, `content`, `author_id`, `status`, `published_at`, `tags` (JSON)
- Permissions: Admin can do everything, users can read and create

## Example Requests

### List all users
```bash
curl http://localhost:3000/api/entity/users
```

### Create a new user
```bash
curl -X POST http://localhost:3000/api/entity/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "profile": {"bio": "Software developer"}
  }'
```

### Get a specific user
```bash
curl http://localhost:3000/api/entity/users/{id}
```

### Update a user
```bash
curl -X PUT http://localhost:3000/api/entity/users/{id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'
```

### Delete a user (requires admin role)
```bash
curl -X DELETE http://localhost:3000/api/entity/users/{id} \
  -H "x-user-role: admin"
```

### Create a post
```bash
curl -X POST http://localhost:3000/api/entity/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my post",
    "author_id": "demo-user",
    "status": "published",
    "tags": ["blog", "tutorial"]
  }'
```

## Authentication

This example uses a simple header-based authentication for demonstration:

- `x-user-id`: The user ID (default: `demo-user`)
- `x-user-role`: The user role (default: `user`)

Example with admin role:
```bash
curl http://localhost:3000/api/entity/users \
  -H "x-user-id: admin-123" \
  -H "x-user-role: admin"
```

## Customization

You can modify the example to:

1. Add more entities by calling `kit.entity()`
2. Define custom fields with validation
3. Set up complex permissions
4. Add workflows for automation
5. Implement proper authentication

## Troubleshooting

### Workspace Dependency Errors

If you get errors like "Workspace dependency not found":
1. Make sure you're in a monorepo with proper workspace configuration
2. Install dependencies from the workspace root instead
3. Or use npm/yarn instead of bun

### Database Connection Issues

If you get connection errors with PostgreSQL:
1. Ensure PostgreSQL is running
2. Check your connection credentials
3. Make sure the database exists

### Port Already in Use

If port 3000 is already in use:
```bash
PORT=3001 bun run dev
```

## Next Steps

- Check out the [SchemaKit documentation](https://github.com/MobtakronIO/schemakit)
- Explore the [API documentation](http://localhost:3000/docs) when running
- Try creating your own entities and workflows
- Implement proper authentication for production use