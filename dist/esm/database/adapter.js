/**
 * Database adapter interface and factory
 */
import { DatabaseError } from '../errors';
/**
 * Abstract database adapter class
 */
export class DatabaseAdapter {
    /**
     * Create a new database adapter
     * @param config Configuration options
     */
    constructor(config = {}) {
        this.config = config;
    }
    /**
     * Create a database adapter instance
     * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
     * @param config Configuration options
     */
    static async create(type = 'sqlite', config = {}) {
        switch (type.toLowerCase()) {
            case 'sqlite':
                // Import SQLiteAdapter using dynamic import
                const { SQLiteAdapter } = await import('./adapters/sqlite');
                return new SQLiteAdapter(config);
            case 'postgres':
                // Import PostgresAdapter using dynamic import
                const { PostgresAdapter } = await import('./adapters/postgres');
                return new PostgresAdapter(config);
            case 'inmemory':
                // Import InMemoryAdapter using dynamic import
                const { InMemoryAdapter } = await import('./adapters/inmemory');
                return new InMemoryAdapter(config);
            default:
                throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
        }
    }
    /**
     * Create a database adapter instance synchronously (for backward compatibility)
     * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
     * @param config Configuration options
     */
    static createSync(type = 'sqlite', config = {}) {
        switch (type.toLowerCase()) {
            case 'sqlite':
                // Use require for synchronous loading
                const { SQLiteAdapter } = require('./adapters/sqlite');
                return new SQLiteAdapter(config);
            case 'postgres':
                // Use require for synchronous loading
                const { PostgresAdapter } = require('./adapters/postgres');
                return new PostgresAdapter(config);
            case 'inmemory':
                // Use require for synchronous loading
                const { InMemoryAdapter } = require('./adapters/inmemory');
                return new InMemoryAdapter(config);
            default:
                throw new DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
        }
    }
}
//# sourceMappingURL=adapter.js.map