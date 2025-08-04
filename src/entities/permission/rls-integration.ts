/**
 * RLS Integration
 * Extends PermissionManager with advanced RLS capabilities
 */

import { PermissionManager } from './permission-manager';
import { RowRestrictionManager } from './row-restriction-manager';
import { RoleRestrictions } from '../../types/permissions';
import { EntityConfiguration, Context } from '../../types/core';

export class RLSPermissionManager extends PermissionManager {
  private rowRestrictionManager: RowRestrictionManager;

  constructor(databaseAdapter: any) {
    super(databaseAdapter);
    this.rowRestrictionManager = new RowRestrictionManager();
  }

  /**
   * Set role-based restrictions
   */
  setRoleRestrictions(restrictions: RoleRestrictions): void {
    this.rowRestrictionManager.setRestrictions(restrictions);
  }

  /**
   * Apply RLS to a base query
   */
  applyRLSToQuery(baseQuery: string, entityName: string, context: Context): string {
    if (!context.user) {
      return baseQuery;
    }

    return this.rowRestrictionManager.generateQuery(
      context.user,
      baseQuery,
      {}, // userInputs - can be extended later
      entityName
    );
  }

  /**
   * Get exposed conditions for user filtering
   */
  getExposedConditions(context: Context): any[] {
    if (!context.user?.roles) {
      return [];
    }

    return this.rowRestrictionManager.getExposedConditions(context.user.roles);
  }

  /**
   * Enhanced RLS conditions that uses the new manager
   * Falls back to original implementation if no advanced restrictions are set
   */
  buildAdvancedRLSConditions(entityConfig: EntityConfiguration, context: Context, userInputs: Record<string, any> = {}): string {
    if (!context.user) {
      return '';
    }

    // Try new RLS manager first
    try {
      const baseQuery = 'SELECT * FROM dummy'; // Temporary base query
      const enhancedQuery = this.rowRestrictionManager.generateQuery(
        context.user,
        baseQuery,
        userInputs,
        entityConfig.entity.entity_table_name
      );
      
      // Extract WHERE clause if RLS was applied
      if (enhancedQuery !== baseQuery) {
        const whereIndex = enhancedQuery.toLowerCase().indexOf('where');
        if (whereIndex !== -1) {
          return enhancedQuery.substring(whereIndex + 5).trim();
        }
      }
    } catch (error) {
      console.warn('Advanced RLS failed, falling back to basic RLS:', error);
    }

    // Fallback to original implementation
    const rlsConditions = this.buildRLSConditions(entityConfig, context);
    return rlsConditions.sql || '';
  }
}