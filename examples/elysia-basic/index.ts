import { Elysia } from 'elysia';
import { SchemaKit } from '@mobtakronio/schemakit';
import { schemaKitElysia } from '@mobtakronio/schemakit-elysia';


export async function startServer() {
  // Get database type from environment or default to SQLite
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  console.log(`🗄️  Using ${dbType.toUpperCase()} database adapter`);
  
  // Initialize SchemaKit with the appropriate adapter
  const kit = new SchemaKit({
    adapter: dbType,
    config: dbType === 'postgres' ? {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespassword',
      database: process.env.DB_NAME || 'postgres'
    } : {
      filename: process.env.DB_FILE || './demo.sqlite'
    },
    multiTenancy: {
      strategy: 'schema'  // Each tenant gets their own schema
    }
  });

 
  console.log('✅ SchemaKit initialized');
  // Create Elysia app
  const app = new Elysia();
  // Add SchemaKit REST API
  app.use(
    schemaKitElysia(kit, {
      basePath: '/api',
      enableDocs: true,
      docsPath: '/docs',
      contextProvider: (request) => ({
        tenantId: 'demo',
        user: {
          id: request.headers.get('x-user-id') || 'demo-user',
          role: request.headers.get('x-user-role') || 'user',
        },
      }),
    })
  );

  // Add a welcome route
  app.get('/', () => ({
    message: 'Welcome to SchemaKit + Elysia Demo!',
    database: dbType.toUpperCase(),
    endpoints: {
      'API Documentation': 'http://localhost:3000/docs',
      'List Entities': 'http://localhost:3000/api/entities',
      'Users CRUD': 'http://localhost:3000/api/entity/users',
      'Posts CRUD': 'http://localhost:3000/api/entity/posts',
    },
    examples: {
      'Create User': {
        method: 'POST',
        url: 'http://localhost:3000/api/entity/users',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user'
        }
      },
      'List Users': {
        method: 'GET',
        url: 'http://localhost:3000/api/entity/users?page=1&limit=10'
      },
      'Get User by ID': {
        method: 'GET',
        url: 'http://localhost:3000/api/entity/users/{id}'
      },
      'Update User': {
        method: 'PUT',
        url: 'http://localhost:3000/api/entity/users/{id}',
        body: {
          name: 'Jane Doe'
        }
      }
    }
  }));

  // Health check
  app.get('/health', async () => {
    try {
      // Test database connection
      const adapter = await kit.db.getAdapter();
      const isConnected = adapter.isConnected();
      
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: {
          type: dbType,
          connected: isConnected
        }
      };
    } catch (error) {
      return { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

   // Start server
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = app.listen(port);

  console.log('');
  console.log('🚀 SchemaKit + Elysia Demo Server Started!');
  console.log(`📱 Server: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
  console.log(`🔍 API Base: http://localhost:${port}/api`);
  console.log('');
  console.log('Example requests:');
  console.log(`curl http://localhost:${port}/api/entities`);
  console.log(`curl http://localhost:${port}/api/entity/users`);
  console.log('');
  console.log('Create a user:');
  console.log(`curl -X POST http://localhost:${port}/api/entity/users \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"name":"Alice","email":"alice@example.com","role":"admin"}'`);
  return { app, port, stop: () => server.stop?.() };
}


// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application only when executed directly
if (import.meta.main) {
  startServer().catch(console.error);
}