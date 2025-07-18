// tests/PermissionChecker.test.ts

import { PermissionChecker } from '../core/PermissionChecker';
import { Permission } from '../types';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('PermissionChecker', () => {
  const mockPermissions: Permission[] = [
    { role: 'admin', create: true, read: true, update: true, delete: true }
  ];

  let checker: PermissionChecker;

  beforeEach(() => {
    checker = new PermissionChecker(mockPermissions);
  });

  it('allows admin to create', () => {
    const result = checker.check('admin', 'create');
    expect(result.allowed).toBe(true);
  });

  it('denies unknown role', () => {
    const result = checker.check('user', 'create');
    expect(result.allowed).toBe(false);
  });
}); 