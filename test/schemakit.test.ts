import { SchemaKit, SchemaKitOptions } from '../src/schemakit';
import { DatabaseAdapter } from '../src/database/adapter';
import { ValidationError, SchemaKitError, EntityNotFoundError } from '../src/errors';
import { Context, EntityConfiguration } from '../src/types';

// Mock the database adapter for testing
jest.mock('../src/database/adapter', () => {
    // Store table data for our mock database
    const mockTables: Record<string, any[]> = {};
    const mockTableSchemas: Record<string, any[]> = {};

    // Create a mock adapter class
    class MockDatabaseAdapter {
        private connected = false;

        async connect(): Promise<void> {
            this.connected = true;
        }

        async disconnect(): Promise<void> {
            this.connected = false;
        }

        isConnected(): boolean {
            return this.connected;
        }

        async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
            // Check if database is installed
            if (sql.includes('information_schema.tables') && sql.includes('system_entities')) {
                return [{ count: 1 }] as unknown as T[];
            }

            // Get database version
            if (sql.includes('system_config') && sql.includes('version')) {
                return [{ version: '1.0.0' }] as unknown as T[];
            }

            // Simple SQL parsing for testing
            if (sql.includes('system_entities') && sql.includes('WHERE name =')) {
                const entityName = params[0];
                if (entityName === 'user') {
                    return [{
                        id: 'user-123',
                        name: 'user',
                        table_name: 'entity_user',
                        display_name: 'User',
                        description: 'User entity',
                        is_active: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        updated_at: '2023-01-01T00:00:00.000Z',
                        metadata: '{}'
                    }] as unknown as T[];
                }
                return [] as unknown as T[];
            }

            if (sql.includes('system_fields') && sql.includes('WHERE entity_id =')) {
                const entityId = params[0];
                if (entityId === 'user-123') {
                    return [
                        {
                            id: 'field-1',
                            entity_id: 'user-123',
                            name: 'name',
                            type: 'string',
                            is_required: true,
                            is_unique: false,
                            default_value: null,
                            validation_rules: '{"minLength": 2, "maxLength": 50}',
                            display_name: 'Name',
                            description: 'User name',
                            order_index: 0,
                            is_active: true,
                            reference_entity: null,
                            metadata: '{}'
                        },
                        {
                            id: 'field-2',
                            entity_id: 'user-123',
                            name: 'email',
                            type: 'string',
                            is_required: true,
                            is_unique: true,
                            default_value: null,
                            validation_rules: '{"pattern": "^[\\\\w-\\\\.]+@([\\\\w-]+\\\\.)+[\\\\w-]{2,4}$"}',
                            display_name: 'Email',
                            description: 'User email',
                            order_index: 1,
                            is_active: true,
                            reference_entity: null,
                            metadata: '{}'
                        },
                        {
                            id: 'field-3',
                            entity_id: 'user-123',
                            name: 'age',
                            type: 'number',
                            is_required: false,
                            is_unique: false,
                            default_value: '18',
                            validation_rules: '{"min": 0, "max": 120}',
                            display_name: 'Age',
                            description: 'User age',
                            order_index: 2,
                            is_active: true,
                            reference_entity: null,
                            metadata: '{}'
                        },
                        {
                            id: 'field-4',
                            entity_id: 'user-123',
                            name: 'is_active',
                            type: 'boolean',
                            is_required: false,
                            is_unique: false,
                            default_value: 'true',
                            validation_rules: null,
                            display_name: 'Is Active',
                            description: 'User status',
                            order_index: 3,
                            is_active: true,
                            reference_entity: null,
                            metadata: '{}'
                        }
                    ] as unknown as T[];
                }
                return [] as unknown as T[];
            }

            if (sql.includes('system_permissions')) {
                return [
                    {
                        id: 'perm-1',
                        entity_id: 'user-123',
                        role: 'admin',
                        action: 'create',
                        conditions: null,
                        is_allowed: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        field_permissions: null
                    },
                    {
                        id: 'perm-2',
                        entity_id: 'user-123',
                        role: 'admin',
                        action: 'read',
                        conditions: null,
                        is_allowed: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        field_permissions: null
                    },
                    {
                        id: 'perm-3',
                        entity_id: 'user-123',
                        role: 'admin',
                        action: 'update',
                        conditions: null,
                        is_allowed: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        field_permissions: null
                    },
                    {
                        id: 'perm-4',
                        entity_id: 'user-123',
                        role: 'admin',
                        action: 'delete',
                        conditions: null,
                        is_allowed: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        field_permissions: null
                    },
                    {
                        id: 'perm-5',
                        entity_id: 'user-123',
                        role: 'user',
                        action: 'read',
                        conditions: null,
                        is_allowed: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        field_permissions: null
                    }
                ] as unknown as T[];
            }

            if (sql.includes('system_views')) {
                return [
                    {
                        id: 'view-1',
                        entity_id: 'user-123',
                        name: 'default',
                        query_config: '{"filters": {}, "sorting": [{"field": "name", "direction": "asc"}]}',
                        fields: '["id", "name", "email", "age", "is_active"]',
                        is_default: true,
                        created_by: null,
                        is_public: true,
                        metadata: '{}'
                    }
                ] as unknown as T[];
            }

            if (sql.includes('system_workflows')) {
                return [] as unknown as T[];
            }

            if (sql.includes('system_rls')) {
                return [] as unknown as T[];
            }

            // Handle entity table queries
            if (sql.includes('SELECT') && sql.includes('FROM entity_user')) {
                // Ensure we have test data
                if (!mockTables['entity_user']) {
                    mockTables['entity_user'] = [];
                }

                // Add a test user if the table is empty
                if (mockTables['entity_user'].length === 0) {
                    mockTables['entity_user'].push({
                        id: 'user-1',
                        name: 'John Doe',
                        email: 'john@example.com',
                        age: 30,
                        is_active: true,
                        created_at: '2023-01-01T00:00:00.000Z',
                        updated_at: '2023-01-01T00:00:00.000Z'
                    });
                }

                return mockTables['entity_user'] as unknown as T[];
            }

            // Handle INSERT queries
            if (sql.includes('INSERT INTO entity_user')) {
                const newUser = {
                    id: 'user-' + Date.now(),
                    name: params[0] || 'Test User',
                    email: params[1] || 'test@example.com',
                    age: params[2] || 25,
                    is_active: params[3] !== undefined ? params[3] : true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (!mockTables['entity_user']) {
                    mockTables['entity_user'] = [];
                }
                mockTables['entity_user'].push(newUser);

                return [newUser] as unknown as T[];
            }

            // Handle UPDATE queries
            if (sql.includes('UPDATE entity_user')) {
                const userId = params[params.length - 1]; // Last param is usually the ID
                if (mockTables['entity_user']) {
                    const userIndex = mockTables['entity_user'].findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        const updatedUser = { ...mockTables['entity_user'][userIndex] };
                        
                        // Update fields based on params
                        if (params[0] !== undefined) updatedUser.name = params[0];
                        if (params[1] !== undefined) updatedUser.email = params[1];
                        if (params[2] !== undefined) updatedUser.age = params[2];
                        if (params[3] !== undefined) updatedUser.is_active = params[3];
                        
                        updatedUser.updated_at = new Date().toISOString();
                        mockTables['entity_user'][userIndex] = updatedUser;
                        
                        return [updatedUser] as unknown as T[];
                    }
                }
                return [] as unknown as T[];
            }

            // Handle DELETE queries
            if (sql.includes('DELETE FROM entity_user')) {
                const userId = params[0];
                if (mockTables['entity_user']) {
                    const userIndex = mockTables['entity_user'].findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        mockTables['entity_user'].splice(userIndex, 1);
                        return [{ changes: 1 }] as unknown as T[];
                    }
                }
                return [{ changes: 0 }] as unknown as T[];
            }

            // Handle COUNT queries
            if (sql.includes('COUNT(*)')) {
                const tableName = sql.match(/FROM\s+(\w+)/)?.[1];
                if (tableName && mockTables[tableName]) {
                    return [{ total: mockTables[tableName].length }] as unknown as T[];
                }
                return [{ total: 0 }] as unknown as T[];
            }

            return [] as unknown as T[];
        }

        async execute(sql: string, params: any[] = []): Promise<{ changes: number, lastInsertId?: string | number }> {
            // Handle schema creation
            if (sql.includes('CREATE TABLE IF NOT EXISTS system_entities')) {
                return { changes: 0 };
            }

            if (sql.includes('CREATE TABLE IF NOT EXISTS system_fields')) {
                return { changes: 0 };
            }

            if (sql.includes('CREATE TABLE IF NOT EXISTS system_permissions')) {
                return { changes: 0 };
            }

            if (sql.includes('CREATE TABLE IF NOT EXISTS system_views')) {
                return { changes: 0 };
            }

            if (sql.includes('CREATE TABLE IF NOT EXISTS system_workflows')) {
                return { changes: 0 };
            }

            if (sql.includes('CREATE TABLE IF NOT EXISTS system_config')) {
                return { changes: 0 };
            }

            if (sql.includes('INSERT OR IGNORE INTO system_config')) {
                return { changes: 1 };
            }

            // Handle entity table creation
            if (sql.includes('CREATE TABLE entity_user')) {
                mockTables['entity_user'] = [];
                return { changes: 0 };
            }

            // Handle INSERT queries
            if (sql.includes('INSERT INTO entity_user')) {
                const newUser = {
                    id: 'user-' + Date.now(),
                    name: params[0] || 'Test User',
                    email: params[1] || 'test@example.com',
                    age: params[2] || 25,
                    is_active: params[3] !== undefined ? params[3] : true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (!mockTables['entity_user']) {
                    mockTables['entity_user'] = [];
                }
                mockTables['entity_user'].push(newUser);

                return { changes: 1, lastInsertId: newUser.id };
            }

            // Handle UPDATE queries
            if (sql.includes('UPDATE entity_user')) {
                const userId = params[params.length - 1];
                if (mockTables['entity_user']) {
                    const userIndex = mockTables['entity_user'].findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        const updatedUser = { ...mockTables['entity_user'][userIndex] };
                        
                        if (params[0] !== undefined) updatedUser.name = params[0];
                        if (params[1] !== undefined) updatedUser.email = params[1];
                        if (params[2] !== undefined) updatedUser.age = params[2];
                        if (params[3] !== undefined) updatedUser.is_active = params[3];
                        
                        updatedUser.updated_at = new Date().toISOString();
                        mockTables['entity_user'][userIndex] = updatedUser;
                        
                        return { changes: 1 };
                    }
                }
                return { changes: 0 };
            }

            // Handle DELETE queries
            if (sql.includes('DELETE FROM entity_user')) {
                const userId = params[0];
                if (mockTables['entity_user']) {
                    const userIndex = mockTables['entity_user'].findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        mockTables['entity_user'].splice(userIndex, 1);
                        return { changes: 1 };
                    }
                }
                return { changes: 0 };
            }

            return { changes: 0 };
        }

        async transaction<T>(callback: (transaction: any) => Promise<T>): Promise<T> {
            return await callback(this);
        }

        async tableExists(tableName: string): Promise<boolean> {
            return mockTables.hasOwnProperty(tableName);
        }

        async createTable(tableName: string, columns: any[]): Promise<void> {
            mockTables[tableName] = [];
            mockTableSchemas[tableName] = columns;
        }

        async getTableColumns(tableName: string): Promise<any[]> {
            return mockTableSchemas[tableName] || [];
        }
    }

    return {
        DatabaseAdapter: MockDatabaseAdapter,
        createAdapter: jest.fn().mockResolvedValue(new MockDatabaseAdapter())
    };
});

describe('SchemaKit - Simplified API', () => {
    let schemaKit: SchemaKit;

    beforeEach(async () => {
        schemaKit = new SchemaKit({
            adapter: {
                type: 'inmemory',
                config: {}
            }
        });
        await schemaKit.init();
    });

    afterEach(async () => {
        await schemaKit.disconnect();
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            expect(schemaKit).toBeInstanceOf(SchemaKit);
        });

        it('should check if database is installed', async () => {
            const isInstalled = await schemaKit.isInstalled();
            expect(isInstalled).toBe(true);
        });

        it('should get database version', async () => {
            const version = await schemaKit.getVersion();
            expect(version).toBe('1.0.0');
        });

        it('should install database schema', async () => {
            await expect(schemaKit.install()).resolves.not.toThrow();
        });

        it('should reinstall database', async () => {
            await expect(schemaKit.reinstall()).resolves.not.toThrow();
        });
    });

    describe('Entity API', () => {
        it('should get entity object', () => {
            const users = schemaKit.entity('user');
            expect(users).toBeDefined();
            expect(typeof users.create).toBe('function');
            expect(typeof users.read).toBe('function');
            expect(typeof users.update).toBe('function');
            expect(typeof users.delete).toBe('function');
            expect(typeof users.findById).toBe('function');
        });

        it('should create entity', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            const newUser = await users.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            }, context);

            expect(newUser).toBeDefined();
            expect(newUser.name).toBe('John Doe');
            expect(newUser.email).toBe('john@example.com');
        });

        it('should read entities', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            // First create a user
            await users.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            }, context);

            // Then read users
            const result = await users.read({}, context);
            
            expect(result).toBeDefined();
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data)).toBe(true);
        });

        it('should update entity', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            // First create a user
            const newUser = await users.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            }, context);

            // Then update the user
            const updatedUser = await users.update(newUser.id, {
                name: 'John Smith',
                age: 31
            }, context);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.name).toBe('John Smith');
            expect(updatedUser.age).toBe(31);
        });

        it('should find entity by ID', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            // First create a user
            const newUser = await users.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            }, context);

            // Then find by ID
            const foundUser = await users.findById(newUser.id, context);
            
            expect(foundUser).toBeDefined();
            expect(foundUser?.name).toBe('John Doe');
            expect(foundUser?.email).toBe('john@example.com');
        });

        it('should delete entity', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            // First create a user
            const newUser = await users.create({
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            }, context);

            // Then delete the user
            const deleted = await users.delete(newUser.id, context);
            
            expect(deleted).toBe(true);

            // Verify user is deleted
            const foundUser = await users.findById(newUser.id, context);
            expect(foundUser).toBeNull();
        });

        it('should get entity fields', async () => {
            const users = schemaKit.entity('user');
            const fields = await users.fields;
            
            expect(Array.isArray(fields)).toBe(true);
            expect(fields.length).toBeGreaterThan(0);
        });

        it('should get entity workflows', async () => {
            const users = schemaKit.entity('user');
            const workflows = await users.workflows;
            
            expect(Array.isArray(workflows)).toBe(true);
        });

        it('should get entity schema', async () => {
            const users = schemaKit.entity('user');
            const schema = await users.schema;
            
            expect(schema).toBeDefined();
            expect(schema.type).toBe('object');
            expect(schema.properties).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle permission denied errors', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'user' }, tenantId: 'tenant1' };
            
            await expect(users.create({
                name: 'John Doe',
                email: 'john@example.com'
            }, context)).rejects.toThrow('Permission denied');
        });

        it('should handle validation errors', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            await expect(users.create({
                name: '', // Invalid: empty name
                email: 'invalid-email' // Invalid: bad email format
            }, context)).rejects.toThrow('Validation failed');
        });

        it('should handle entity not found', async () => {
            const users = schemaKit.entity('user');
            const context = { user: { role: 'admin' }, tenantId: 'tenant1' };
            
            await expect(users.findById('nonexistent-id', context)).resolves.toBeNull();
        });
    });

    describe('Cache Management', () => {
        it('should clear entity cache', () => {
            expect(() => schemaKit.clearEntityCache()).not.toThrow();
        });

        it('should clear specific entity cache', () => {
            expect(() => schemaKit.clearEntityCache('user')).not.toThrow();
        });
    });

    describe('Static Methods', () => {
        afterEach(async () => {
            await SchemaKit.shutdownAll();
        });

        it('should initialize default instance', async () => {
            const instance = await SchemaKit.initDefault({
                adapter: { type: 'inmemory', config: {} }
            });
            
            expect(instance).toBeInstanceOf(SchemaKit);
            
            const defaultInstance = SchemaKit.getDefault();
            expect(defaultInstance).toBe(instance);
        });

        it('should initialize named instances', async () => {
            const instance1 = await SchemaKit.init('primary', {
                adapter: { type: 'inmemory', config: {} }
            });
            const instance2 = await SchemaKit.init('secondary', {
                adapter: { type: 'inmemory', config: {} }
            });
            
            expect(instance1).toBeInstanceOf(SchemaKit);
            expect(instance2).toBeInstanceOf(SchemaKit);
            expect(instance1).not.toBe(instance2);
            
            const retrievedInstance1 = SchemaKit.getInstance('primary');
            const retrievedInstance2 = SchemaKit.getInstance('secondary');
            
            expect(retrievedInstance1).toBe(instance1);
            expect(retrievedInstance2).toBe(instance2);
        });

        it('should list all instances', async () => {
            await SchemaKit.initDefault({ adapter: { type: 'inmemory', config: {} } });
            await SchemaKit.init('test1', { adapter: { type: 'inmemory', config: {} } });
            await SchemaKit.init('test2', { adapter: { type: 'inmemory', config: {} } });

            const instances = SchemaKit.listInstances();
            expect(instances).toContain('test1');
            expect(instances).toContain('test2');
        });

        it('should get cache statistics', () => {
            const stats = SchemaKit.getCacheStats();
            expect(stats).toHaveProperty('entityCacheSize');
            expect(stats).toHaveProperty('instanceCacheSize');
            expect(stats).toHaveProperty('entities');
            expect(stats).toHaveProperty('instances');
        });

        it('should clear all caches', () => {
            expect(() => SchemaKit.clearAllCache()).not.toThrow();
        });

        it('should shutdown instances', async () => {
            await SchemaKit.init('test', { adapter: { type: 'inmemory', config: {} } });
            
            let instances = SchemaKit.listInstances();
            expect(instances).toContain('test');
            
            await SchemaKit.shutdown('test');
            
            expect(() => SchemaKit.getInstance('test')).toThrow();
        });

        it('should shutdown all instances', async () => {
            await SchemaKit.initDefault({ adapter: { type: 'inmemory', config: {} } });
            await SchemaKit.init('test1', { adapter: { type: 'inmemory', config: {} } });
            await SchemaKit.init('test2', { adapter: { type: 'inmemory', config: {} } });
            
            let instances = SchemaKit.listInstances();
            expect(instances).toHaveLength(3);
            
            await SchemaKit.shutdownAll();
            
            expect(() => SchemaKit.getDefault()).toThrow();
            expect(() => SchemaKit.getInstance('test1')).toThrow();
            expect(() => SchemaKit.getInstance('test2')).toThrow();
            
            instances = SchemaKit.listInstances();
            expect(instances).toHaveLength(0);
        });
    });
});