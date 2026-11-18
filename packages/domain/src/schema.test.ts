import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './schema';

describe('migrations', () => {
  it('are a non empty ordered list of SQL', () => {
    expect(MIGRATIONS.length).toBeGreaterThanOrEqual(7);
    for (const sql of MIGRATIONS) expect(sql.trim().length).toBeGreaterThan(0);
  });

  it('keep every user data table carrying the sync columns', () => {
    const all = MIGRATIONS.join('\n');
    for (const table of ['sermons', 'notes', 'studies', 'highlights', 'bookmarks']) {
      expect(all).toMatch(new RegExp(`CREATE TABLE ${table} `));
      expect(all).toMatch(new RegExp('ALTER TABLE ' + table + ' +ADD COLUMN rev'));
    }
  });
});
