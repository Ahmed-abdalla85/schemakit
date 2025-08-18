/**
 * InstallManager Tests
 * Tests for database installation and setup functionality
 * Focuses on behavior and outcomes, not implementation details
 */

import { InstallManager } from '../../src/database/install-manager';
import { DatabaseAdapter, type ColumnDefinition } from '../../src/database/adapter';

class MockAdapter extends DatabaseAdapter {
  private connected = false;
  private schemas = new Set<string>();
  private tables = new Set<string>();

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  isConnected(): boolean { return this.connected; }

  async query<T = any>(): Promise<T[]> { return [] as any; }
  async execute(): Promise<{ changes: number; lastInsertId?: string | number | undefined; }> { return { changes: 1 }; }
  async transaction<T>(callback: (transaction: DatabaseAdapter) => Promise<T>): Promise<T> { return callback(this); }

  async tableExists(schema: string, tableName: string): Promise<boolean> {
    return this.tables.has(`${schema}.${tableName}`);
  }
  async createTable(tableName: string, columns: ColumnDefinition[]): Promise<void> {
    this.tables.add(tableName);
  }
  async getTableColumns(tableName: string): Promise<ColumnDefinition[]> { return []; }

  async select(): Promise<any[]> { return []; }
  async insert(): Promise<any> { return {}; }
  async update(): Promise<any> { return {}; }
  async delete(): Promise<void> { }
  async count(): Promise<number> { return 0; }
  async findById(): Promise<any | null> { return null; }

  async createSchema(schemaName: string): Promise<void> { this.schemas.add(schemaName); }
  async dropSchema(schemaName: string): Promise<void> { this.schemas.delete(schemaName); }
  async listSchemas(): Promise<string[]> { return Array.from(this.schemas); }
}

describe('InstallManager', () => {
  let adapter: MockAdapter;
  let installManager: InstallManager;

  beforeEach(() => {
    adapter = new MockAdapter({});
    installManager = new InstallManager(adapter);
  });

  describe('Installation Detection', () => {
    test('should detect database as not installed initially', async () => {
      await adapter.connect();
      const isInstalled = await installManager.isInstalled();
      expect(isInstalled).toBe(false);
    });
  });

  describe('Schema Installation', () => {
    test('should install schema successfully and be detectable', async () => {
      await adapter.connect();
      expect(await installManager.isInstalled()).toBe(false);
      await installManager.install('public');
      expect(await installManager.isInstalled()).toBe(true);
    });

    test('should create all required system tables', async () => {
      await adapter.connect();
      await installManager.install('public');
      const mustExist = [
        'public.system_entities',
        'public.system_fields',
        'public.system_permissions',
        'public.system_views',
        'public.system_workflows',
        'public.system_rls'
      ];
      for (const t of mustExist) {
        // tableExists takes (schema, table)
        const [schema, table] = t.split('.');
        expect(await adapter.tableExists(schema, table)).toBe(true);
      }
    });
  });

  describe('ensureReady', () => {
    test('should install database if not already installed', async () => {
      await adapter.connect();
      expect(await installManager.isInstalled()).toBe(false);
      await installManager.ensureReady();
      expect(await installManager.isInstalled()).toBe(true);
    });
  });
});