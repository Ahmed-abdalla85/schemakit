/**
 * Unit tests for ID generation utilities
 */
import {
  generateId,
  generateUUID,
  generateShortId,
  generateSequentialId,
  generateTimestampId,
  isValidUUID,
  generatePrefixedId
} from '../../../src/utils/id-generation';

describe('ID Generation Utilities', () => {
  describe('generateId', () => {
    it('should generate a valid UUID v4 format', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should always have version 4 in the correct position', () => {
      const id = generateId();
      expect(id.charAt(14)).toBe('4');
    });

    it('should have correct variant bits', () => {
      const id = generateId();
      const variantChar = id.charAt(19);
      expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase());
    });
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID format', () => {
      const id = generateUUID();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateUUID());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateShortId', () => {
    it('should generate an 8-character ID', () => {
      const id = generateShortId();
      expect(id).toHaveLength(8);
    });

    it('should contain only alphanumeric characters', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique short IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateShortId());
      }
      // Should have high uniqueness (allow for small chance of collision)
      expect(ids.size).toBeGreaterThan(990);
    });
  });

  describe('generateSequentialId', () => {
    it('should generate sequential IDs for a table', () => {
      const lastIds = new Map<string, number>();
      
      const id1 = generateSequentialId('users', lastIds);
      const id2 = generateSequentialId('users', lastIds);
      const id3 = generateSequentialId('users', lastIds);
      
      expect(id1).toBe('1');
      expect(id2).toBe('2');
      expect(id3).toBe('3');
    });

    it('should maintain separate sequences for different tables', () => {
      const lastIds = new Map<string, number>();
      
      const usersId1 = generateSequentialId('users', lastIds);
      const postsId1 = generateSequentialId('posts', lastIds);
      const usersId2 = generateSequentialId('users', lastIds);
      const postsId2 = generateSequentialId('posts', lastIds);
      
      expect(usersId1).toBe('1');
      expect(postsId1).toBe('1');
      expect(usersId2).toBe('2');
      expect(postsId2).toBe('2');
    });

    it('should continue from existing last ID', () => {
      const lastIds = new Map<string, number>();
      lastIds.set('users', 10);
      
      const id = generateSequentialId('users', lastIds);
      expect(id).toBe('11');
    });
  });

  describe('generateTimestampId', () => {
    it('should generate an ID with timestamp prefix', () => {
      const id = generateTimestampId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
    });

    it('should generate sortable IDs', async () => {
      const id1 = generateTimestampId();
      await new Promise(resolve => setTimeout(resolve, 1));
      const id2 = generateTimestampId();
      
      expect(id1 < id2).toBe(true);
    });

    it('should generate unique timestamp IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTimestampId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUID formats', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        '123e4567e89b12d3a456426614174000', // no hyphens
        '123e4567-e89b-02d3-a456-426614174000', // invalid version
        '123e4567-e89b-12d3-c456-426614174000', // invalid variant
        '',
        'not-a-uuid',
        '123'
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it('should validate UUIDs generated by generateId', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateId();
        expect(isValidUUID(id)).toBe(true);
      }
    });
  });

  describe('generatePrefixedId', () => {
    it('should generate ID with default separator', () => {
      const id = generatePrefixedId('user');
      expect(id).toMatch(/^user_[a-z0-9]{8}$/);
    });

    it('should generate ID with custom separator', () => {
      const id = generatePrefixedId('post', '-');
      expect(id).toMatch(/^post-[a-z0-9]{8}$/);
    });

    it('should generate unique prefixed IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePrefixedId('test'));
      }
      expect(ids.size).toBe(100);
    });

    it('should handle empty prefix', () => {
      const id = generatePrefixedId('');
      expect(id).toMatch(/^_[a-z0-9]{8}$/);
    });

    it('should handle different prefixes', () => {
      const userId = generatePrefixedId('user');
      const postId = generatePrefixedId('post');
      const commentId = generatePrefixedId('comment');
      
      expect(userId.startsWith('user_')).toBe(true);
      expect(postId.startsWith('post_')).toBe(true);
      expect(commentId.startsWith('comment_')).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should work together for different ID types', () => {
      const uuid = generateId();
      const shortId = generateShortId();
      const timestampId = generateTimestampId();
      const prefixedId = generatePrefixedId('entity');
      
      expect(isValidUUID(uuid)).toBe(true);
      expect(shortId).toHaveLength(8);
      expect(timestampId).toContain('-');
      expect(prefixedId).toContain('entity_');
      
      // All should be unique
      const ids = [uuid, shortId, timestampId, prefixedId];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(4);
    });
  });
});