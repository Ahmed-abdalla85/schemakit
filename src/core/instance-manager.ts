/**
 * InstanceManager
 * Manages SchemaKit instances and caching
 */
import { SchemaKit, SchemaKitOptions } from '../schemakit-optimized';

export class InstanceManager {
  private static instances: Map<string, SchemaKit> = new Map();
  private static defaultInstance: SchemaKit | null = null;

  /**
   * Initialize default instance
   */
  static async initDefault(options: SchemaKitOptions): Promise<SchemaKit> {
    const instance = new SchemaKit(options);
    await instance.init();
    this.defaultInstance = instance;
    this.instances.set('default', instance);
    return instance;
  }

  /**
   * Initialize named instance
   */
  static async init(instanceName: string, options: SchemaKitOptions): Promise<SchemaKit> {
    const instance = new SchemaKit(options);
    await instance.init();
    this.instances.set(instanceName, instance);
    return instance;
  }

  /**
   * Get default instance
   */
  static getDefault(): SchemaKit {
    if (!this.defaultInstance) {
      throw new Error('Default SchemaKit instance not initialized');
    }
    return this.defaultInstance;
  }

  /**
   * Get named instance
   */
  static getInstance(instanceName: string): SchemaKit {
    const instance = this.instances.get(instanceName);
    if (!instance) {
      throw new Error(`SchemaKit instance '${instanceName}' not found`);
    }
    return instance;
  }

  /**
   * Clear entity cache
   */
  static clearEntityCache(entityName?: string, tenantId?: string, instanceName?: string): void {
    if (instanceName) {
      const instance = this.instances.get(instanceName);
      if (instance) {
        instance.clearEntityCache(entityName);
      }
    } else {
      // Clear from all instances
      for (const instance of this.instances.values()) {
        instance.clearEntityCache(entityName);
      }
    }
  }

  /**
   * Clear all caches
   */
  static clearAllCache(): void {
    for (const instance of this.instances.values()) {
      instance.clearEntityCache();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { entityCacheSize: number; instanceCacheSize: number; entities: string[]; instances: string[] } {
    const instances = Array.from(this.instances.keys());
    let totalEntityCacheSize = 0;
    const allEntities: string[] = [];

    for (const instance of this.instances.values()) {
      // Note: This would need a method to get cache stats from SchemaKit
      // For now, we'll return basic info
      totalEntityCacheSize += 0; // Placeholder
    }

    return {
      entityCacheSize: totalEntityCacheSize,
      instanceCacheSize: this.instances.size,
      entities: allEntities,
      instances
    };
  }

  /**
   * List all instances
   */
  static listInstances(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Shutdown instance
   */
  static async shutdown(instanceName?: string): Promise<void> {
    if (instanceName) {
      const instance = this.instances.get(instanceName);
      if (instance) {
        await instance.disconnect();
        this.instances.delete(instanceName);
        if (this.defaultInstance === instance) {
          this.defaultInstance = null;
        }
      }
    } else {
      // Shutdown all instances
      await this.shutdownAll();
    }
  }

  /**
   * Shutdown all instances
   */
  static async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values()).map(instance => instance.disconnect());
    await Promise.all(shutdownPromises);
    this.instances.clear();
    this.defaultInstance = null;
  }
}