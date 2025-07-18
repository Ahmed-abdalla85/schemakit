/**
 * Schema Loader - Handles entity configuration loading and caching
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration } from '../types';
export interface SchemaLoaderOptions {
    cache?: {
        enabled?: boolean;
        ttl?: number;
    };
    sqlPath?: string;
    version?: string;
}
export interface InstallationInfo {
    id: number;
    version: string;
    installed_at: string;
    updated_at: string;
    metadata?: string;
}
/**
 * Schema Loader class
 */
export declare class SchemaLoader {
    private databaseAdapter;
    private options;
    private entityCache;
    private isInstalled;
    constructor(databaseAdapter: DatabaseAdapter, options?: SchemaLoaderOptions);
    /**
     * Load entity configuration from database
     * @param entityName Entity name
     * @param context User context
     */
    loadEntity(entityName: string, context?: Context): Promise<EntityConfiguration>;
    /**
     * Reload entity configuration from database
     * @param entityName Entity name
     */
    reloadEntity(entityName: string): Promise<EntityConfiguration>;
    /**
     * Get loaded entity names
     */
    getLoadedEntities(): string[];
    /**
     * Ensure SchemaKit is installed
     * @private
     */
    private ensureInstallation;
    /**
     * Get installation information
     * @private
     */
    private getInstallationInfo;
    /**
     * Install SchemaKit by running schema and seed SQL files
     * @private
     */
    private install;
    /**
     * Update SchemaKit version
     * @param fromVersion Current version
     * @param toVersion Target version
     * @private
     */
    private updateVersion;
    /**
     * Run SQL file
     * @param filename SQL file name
     * @private
     */
    private runSqlFile;
    /**
     * Split SQL content into individual statements
     * @param sqlContent SQL content
     * @private
     */
    private splitSqlStatements;
    /**
     * Check if SchemaKit is installed
     */
    isSchemaKitInstalled(): Promise<boolean>;
    /**
     * Get SchemaKit version
     */
    getSchemaKitVersion(): Promise<string | null>;
    /**
     * Force reinstall SchemaKit (useful for development/testing)
     */
    reinstall(): Promise<void>;
    /**
     * Load entity definition from database
     * @param entityName Entity name
     * @private
     */
    private loadEntityDefinition;
    /**
     * Load entity fields from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityFields;
    /**
     * Load entity permissions from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    private loadEntityPermissions;
    /**
     * Load entity views from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityViews;
    /**
     * Load entity workflows from database
     * @param entityId Entity ID
     * @private
     */
    private loadEntityWorkflows;
    /**
     * Load entity RLS (Row Level Security) from database
     * @param entityId Entity ID
     * @param context User context
     * @private
     */
    private loadEntityRLS;
}
