import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SQLITE_COMPATIBILITY_MIGRATIONS, SQLITE_SCHEMA_DDL } from '../src/services/storage/sqliteSchema.ts';

describe('SQLite schema parity', () => {
  test('persists company context for users and audit entries', () => {
    assert.match(SQLITE_SCHEMA_DDL, /company_id TEXT[\s\S]*FOREIGN KEY \(company_id\)/);
    assert.match(SQLITE_SCHEMA_DDL, /CREATE INDEX IF NOT EXISTS idx_users_company ON users\(company_id\)/);
    assert.match(SQLITE_SCHEMA_DDL, /CREATE TABLE IF NOT EXISTS audit_log/);
    assert.match(SQLITE_SCHEMA_DDL, /business_id TEXT/);
    assert.deepEqual(SQLITE_COMPATIBILITY_MIGRATIONS, ['ALTER TABLE users ADD COLUMN company_id TEXT;']);
  });
});