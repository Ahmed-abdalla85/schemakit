import { Elysia } from 'elysia';
import { SchemaKit } from '@mobtakronio/schemakit';
import { schemaKitElysia } from '@mobtakronio/schemakit-elysia';

async function main() {
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
      database: process.env.DB_NAME || 'schemakit_demo'
    } : {
      filename: process.env.DB_FILE || './demo.sqlite'
    }
  });

  // Initialize the database adapter
  await kit.init();
  console.log('✅ Database adapter initialized');

  // Setup example entities
  await setupExampleEntities(kit);
  
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
  app.listen(port);

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
}

async function setupExampleEntities(kit: SchemaKit) {
  console.log('Setting up example entities...');
  
  try {
    // Create Users entity
    const users = await kit.entity('users', 'demo');
    
    // Define fields for users
    await users.field('name', 'text', { required: true });
    await users.field('email', 'text', { required: true, unique: true });
    await users.field('role', 'text', { defaultValue: 'user' });
    await users.field('is_active', 'boolean', { defaultValue: true });
    await users.field('profile', 'json');

    // Add some permissions
    await users.permission('create', { role: ['admin', 'user'] });
    await users.permission('read', { role: ['admin', 'user'] });
    await users.permission('update', { role: ['admin'], own: true });
    await users.permission('delete', { role: ['admin'] });

    console.log('✅ Users entity configured');

    // Create Posts entity
    const posts = await kit.entity('posts', 'demo');
    
    await posts.field('title', 'text', { required: true });
    await posts.field('content', 'text', { required: true });
    await posts.field('author_id', 'text', { required: true });
    await posts.field('status', 'text', { defaultValue: 'draft' });
    await posts.field('published_at', 'datetime');
    await posts.field('tags', 'json');

    // Posts permissions
    await posts.permission('create', { role: ['admin', 'user'] });
    await posts.permission('read', { role: ['admin', 'user'] });
    await posts.permission('update', { role: ['admin'], own: true });
    await posts.permission('delete', { role: ['admin'] });

    console.log('✅ Posts entity configured');

    // Check if we need to insert sample data
    const existingUsers = await users.find({});
    if (existingUsers.length === 0) {
      // Insert some sample data
      await users.insert({
        name: 'Demo Admin',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true,
        profile: { bio: 'System administrator' }
      });

      await users.insert({
        name: 'Demo User',
        email: 'user@example.com',
        role: 'user',
        is_active: true,
        profile: { bio: 'Regular user' }
      });

      await posts.insert({
        title: 'Welcome to SchemaKit!',
        content: 'This is a demo post created with SchemaKit and Elysia.',
        author_id: 'demo-user',
        status: 'published',
        published_at: new Date().toISOString(),
        tags: ['demo', 'schemakit', 'elysia'],
      });

      await posts.insert({
        title: 'Dynamic Schema Power',
        content: 'SchemaKit allows you to create and modify entities at runtime!',
        author_id: 'demo-admin',
        status: 'published',
        published_at: new Date().toISOString(),
        tags: ['features', 'dynamic', 'runtime'],
      });

      console.log('✅ Sample data inserted');
    } else {
      console.log('ℹ️  Sample data already exists');
    }
    
  } catch (error) {
    console.error('Error setting up entities:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch(console.error);