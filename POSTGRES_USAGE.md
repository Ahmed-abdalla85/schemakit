# PostgreSQL Adapter Usage

The PostgreSQL adapter is now fully functional using the `pg` package.

## Installation

The `pg` package has been installed as a dependency:

```bash
npm install pg @types/pg
```

## Usage Example

```typescript
import { PostgresAdapter } from './src/database/adapters/postgres';

// Create an instance with your database configuration
const adapter = new PostgresAdapter({
  host: 'localhost',
  port: 5432,
  database: 'your_database',
  user: 'your_username',
  password: 'your_password',
  ssl: false // Set to true for SSL connections
});

// Connect to the database
await adapter.connect();

// Execute queries
const users = await adapter.query('SELECT * FROM users');

// Execute statements
const result = await adapter.execute(
  'INSERT INTO users (name, email) VALUES ($1, $2)',
  ['John Doe', 'john@example.com']
);

// Disconnect when done
await adapter.disconnect();
```

## Configuration Options

- `host`: PostgreSQL server hostname (default: 'localhost')
- `port`: PostgreSQL server port (default: 5432)
- `database`: Database name (default: 'postgres')
- `user`: Database username
- `password`: Database password
- `ssl`: Enable SSL connection (default: false)
- `connectionTimeout`: Connection timeout in milliseconds (default: 30000)
- `queryTimeout`: Query timeout in milliseconds (default: 30000)
