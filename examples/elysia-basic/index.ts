import { Elysia } from 'elysia';
import { SchemaKit } from '../../packages/schemakit/dist/index.js';
import { schemaKitElysia } from '../../packages/schemakit-elysia/dist/index.js';

async function main() {
  // Initialize SchemaKit
  const kit = new SchemaKit({
    adapter: {
      type: 'postgres',
      config: {
        host: 'localhost',
        port: 5852,
        user: 'postgres',
        password: 'postgrespassword',
        database: 'processkit'
      }
    }
  });

  
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
      }
    }
  }));

  // Health check
  app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

   // Start server
  const port = 3000;
  app.listen(port);

  console.log('🚀 SchemaKit + Elysia Demo Server Started!');
  console.log(`📱 Server: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
  console.log(`🔍 API Base: http://localhost:${port}/api`);
  console.log('');
  console.log('Example requests:');
  console.log(`curl http://localhost:${port}/api/entities`);
  console.log(`curl http://localhost:${port}/api/entity/entities`);
  console.log('');
  console.log('Create a user:');
  console.log(`curl -X POST http://localhost:${port}/api/entity/users \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"name":"Alice","email":"alice@example.com","role":"admin"}'`);
}

// async function setupExampleEntities(kit: SchemaKit) {
//   console.log('Setting up example entities...');
  
//   try {
//     // Create Users entity
//     const users = await kit.entity('users', 'demo');
    
//     // Define fields for users
//     await users.field('name', 'text', { required: true });
//     await users.field('email', 'text', { required: true, unique: true });
//     await users.field('role', 'text', { defaultValue: 'user' });
//     await users.field('is_active', 'boolean', { defaultValue: true });
//     await users.field('profile', 'json');

//     // Add some permissions
//     await users.permission('create', { role: ['admin', 'user'] });
//     await users.permission('read', { role: ['admin', 'user'] });
//     await users.permission('update', { role: ['admin'], own: true });
//     await users.permission('delete', { role: ['admin'] });

//     console.log('✅ Users entity configured');

//     // Create Posts entity
//     const posts = await kit.entity('posts', 'demo');
    
//     await posts.field('title', 'text', { required: true });
//     await posts.field('content', 'text', { required: true });
//     await posts.field('author_id', 'text', { required: true });
//     await posts.field('status', 'text', { defaultValue: 'draft' });
//     await posts.field('published_at', 'datetime');
//     await posts.field('tags', 'json');

//     // Posts permissions
//     await posts.permission('create', { role: ['admin', 'user'] });
//     await posts.permission('read', { role: ['admin', 'user'] });
//     await posts.permission('update', { role: ['admin'], own: true });
//     await posts.permission('delete', { role: ['admin'] });

//     console.log('✅ Posts entity configured');

//     // Insert some sample data
//     await users.insert({
//       name: 'Demo Admin',
//       email: 'admin@example.com',
//       role: 'admin',
//       is_active: true,
//     });

//     await users.insert({
//       name: 'Demo User',
//       email: 'user@example.com',
//       role: 'user',
//       is_active: true,
//     });

//     await posts.insert({
//       title: 'Welcome to SchemaKit!',
//       content: 'This is a demo post created with SchemaKit and Elysia.',
//       author_id: 'demo-user',
//       status: 'published',
//       tags: ['demo', 'schemakit', 'elysia'],
//     });

//     console.log('✅ Sample data inserted');
    
//   } catch (error) {
//     console.error('Error setting up entities:', error);
//   }
// }

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch(console.error);