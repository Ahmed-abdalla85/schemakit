/**
 * SqlQueryLoader
 * Handles loading of SQL queries from external files
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export class SqlQueryLoader {
  private queryCache: Map<string, string> = new Map();

  /**
   * Load a SQL query by name
   * @param queryName Name of the query
   * @returns SQL query string
   */
  async loadQuery(queryName: string): Promise<string> {
    // Check cache first
    if (this.queryCache.has(queryName)) {
      return this.queryCache.get(queryName)!;
    }

    try {
      // Try to load from sql/queries/{queryName}.sql
      const queryPath = join(process.cwd(), 'sql', 'queries', `${queryName}.sql`);
      const query = readFileSync(queryPath, 'utf8').trim();
      
      // Cache the query
      this.queryCache.set(queryName, query);
      return query;
    } catch (error) {
      // Fallback to embedded queries
      const embeddedQuery = this.getEmbeddedQuery(queryName);
      if (embeddedQuery) {
        this.queryCache.set(queryName, embeddedQuery);
        return embeddedQuery;
      }
      
      throw new Error(`SQL query '${queryName}' not found`);
    }
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get embedded queries (fallback)
   * @param queryName Query name
   * @returns SQL query string or null
   */
  private getEmbeddedQuery(queryName: string): string | null {
    const queries: Record<string, string> = {
      'check-installation': `
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type = ? AND name = ?
      `,

      'get-version': `
        SELECT value 
        FROM system_settings 
        WHERE key = ?
      `,

      'load-entity-definition': `
        SELECT * 
        FROM system_entities 
        WHERE name = ? AND is_active = ?
      `,

      'load-entity-fields': `
        SELECT * 
        FROM system_fields 
        WHERE entity_id = ? AND is_active = ? 
        ORDER BY order_index ASC
      `,

      'load-entity-permissions': `
        SELECT * 
        FROM system_permissions 
        WHERE entity_id = ? AND role IN (?) AND is_active = ?
      `,

      'load-entity-views': `
        SELECT * 
        FROM system_views 
        WHERE entity_id = ?
      `,

      'load-entity-workflows': `
        SELECT * 
        FROM system_workflows 
        WHERE entity_id = ? AND is_active = ? 
        ORDER BY order_index ASC
      `,

      'load-entity-rls': `
        SELECT * 
        FROM system_rls 
        WHERE entity_id = ? AND role IN (?) AND is_active = ?
      `,

      'check-table-exists': `
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type = ? AND name = ?
      `
    };

    return queries[queryName] || null;
  }
}