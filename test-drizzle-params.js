// Test script to verify Drizzle parameter handling
import { sql } from 'drizzle-orm';

// Test 1: Check how sql.raw handles parameters
console.log('Test 1: sql.raw with parameters');
try {
  const query = 'SELECT * FROM users WHERE id = $1 AND name = $2';
  const params = [1, 'John'];
  
  // This is what the current code does
  const rawQuery = sql.raw(query, params);
  console.log('Raw query:', rawQuery);
  console.log('Query SQL:', rawQuery.sql);
  console.log('Query params:', rawQuery.params);
} catch (error) {
  console.error('Error:', error.message);
}

// Test 2: Check the correct way to use Drizzle with parameters
console.log('\nTest 2: Correct Drizzle parameter handling');
try {
  // Drizzle expects you to build queries using its query builder, not raw SQL with placeholders
  // For raw SQL with parameters, you need to use the underlying driver
  console.log('For raw SQL with positional parameters, use the database driver directly');
} catch (error) {
  console.error('Error:', error.message);
}