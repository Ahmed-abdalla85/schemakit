/**
 * RLS Tests
 * Simple tests to verify Row Level Security functionality
 */

import { RowRestrictionManager } from '../../src/entities/permission/row-restriction-manager';
import { RoleRestrictions } from '../../src/types/permissions';

describe('Row Level Security', () => {
  let rlsManager: RowRestrictionManager;

  beforeEach(() => {
    rlsManager = new RowRestrictionManager();
  });

  describe('Basic RLS functionality', () => {
    test('should apply user restrictions when no roles match', () => {
      const user = { id: '123', roles: ['user'] };
      const baseQuery = 'SELECT * FROM tasks';
      
      const result = rlsManager.generateQuery(user, baseQuery, {}, 'tasks');
      
      expect(result).toBe('SELECT * FROM tasks WHERE created_by = \'123\'');
    });

    test('should apply role-based restrictions', () => {
      const restrictions: RoleRestrictions = {
        'admin': [{
          conditions: [{
            field: 'department',
            operator: 'eq',
            value: 'currentUser.department',
            exposed: false
          }],
          combinator: 'AND'
        }]
      };

      rlsManager.setRestrictions(restrictions);

      const user = { 
        id: '123', 
        roles: ['admin'], 
        department: 'HR' 
      };
      const baseQuery = 'SELECT * FROM tasks';
      
      const result = rlsManager.generateQuery(user, baseQuery, {}, 'tasks');
      
      expect(result).toBe('SELECT * FROM tasks WHERE (department = \'HR\')');
    });

    test('should handle role hierarchy correctly', () => {
      const restrictions: RoleRestrictions = {
        '5': [{ // Higher role number
          conditions: [{
            field: 'status',
            operator: 'in',
            value: ['active', 'pending'],
            exposed: false
          }],
          combinator: 'AND'
        }],
        '3': [{ // Lower role number
          conditions: [{
            field: 'created_by',
            operator: 'eq',
            value: 'currentUser.id',
            exposed: false
          }],
          combinator: 'AND'
        }]
      };

      rlsManager.setRestrictions(restrictions);

      const user = { 
        id: '123', 
        roles: ['3', '5'] // User has both roles
      };
      
      const baseQuery = 'SELECT * FROM tasks';
      const result = rlsManager.generateQuery(user, baseQuery, {}, 'tasks');
      
      // Should use role 5 (higher priority)
      expect(result).toBe('SELECT * FROM tasks WHERE (status IN (\'active\', \'pending\'))');
    });

    test('should handle exposed conditions with user inputs', () => {
      const restrictions: RoleRestrictions = {
        'manager': [{
          conditions: [
            {
              field: 'department',
              operator: 'eq',
              value: 'currentUser.department',
              exposed: false
            },
            {
              field: 'priority',
              operator: 'eq',
              value: 'high',
              exposed: true
            }
          ],
          combinator: 'AND'
        }]
      };

      rlsManager.setRestrictions(restrictions);

      const user = { 
        id: '123', 
        roles: ['manager'], 
        department: 'IT' 
      };
      
      const userInputs = { priority: 'urgent' };
      const baseQuery = 'SELECT * FROM tasks';
      
      const result = rlsManager.generateQuery(user, baseQuery, userInputs, 'tasks');
      
      expect(result).toContain('department = \'IT\'');
      expect(result).toContain('priority = \'urgent\'');
    });

    test('should handle multiple operators correctly', () => {
      const restrictions: RoleRestrictions = {
        'analyst': [{
          conditions: [
            {
              field: 'created_at',
              operator: 'gte',
              value: '2024-01-01',
              exposed: false
            },
            {
              field: 'status',
              operator: 'notIn',
              value: ['deleted', 'archived'],
              exposed: false
            }
          ],
          combinator: 'AND'
        }]
      };

      rlsManager.setRestrictions(restrictions);

      const user = { id: '123', roles: ['analyst'] };
      const baseQuery = 'SELECT * FROM tasks';
      
      const result = rlsManager.generateQuery(user, baseQuery, {}, 'tasks');
      
      expect(result).toContain('created_at >= \'2024-01-01\'');
      expect(result).toContain('status NOT IN (\'deleted\', \'archived\')');
    });
  });

  describe('Exposed conditions', () => {
    test('should return exposed conditions for user roles', () => {
      const restrictions: RoleRestrictions = {
        'user': [{
          conditions: [
            {
              field: 'priority',
              operator: 'eq',
              value: 'medium',
              exposed: true
            },
            {
              field: 'department',
              operator: 'eq',
              value: 'currentUser.department',
              exposed: false
            }
          ],
          combinator: 'AND'
        }]
      };

      rlsManager.setRestrictions(restrictions);
      
      const exposedConditions = rlsManager.getExposedConditions(['user']);
      
      expect(exposedConditions).toHaveLength(1);
      expect(exposedConditions[0].field).toBe('priority');
      expect(exposedConditions[0].exposed).toBe(true);
    });
  });
});