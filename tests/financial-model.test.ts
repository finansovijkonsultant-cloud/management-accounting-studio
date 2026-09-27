import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BankingParserService } from '../src/services/banking/bankingParserService.ts';
import { fromCents, toCents } from '../src/services/storage/sqliteSchema.ts';

describe('financial model validation', () => {
  test('stores monetary values as integer minor units without float drift', () => {
    assert.equal(toCents(10.005), 1001);
    assert.equal(toCents(-12.34), -1234);
    assert.equal(fromCents(1001), 10.01);
  });

  test('creates stable idempotency keys for equivalent bank rows', async () => {
    const first = await BankingParserService.calculateIdempotencyKey(
      '2026-09-27',
      125050,
      'acc-1',
      'Оплата поставщику',
    );
    const second = await BankingParserService.calculateIdempotencyKey(
      ' 2026-09-27 ',
      125050,
      ' acc-1',
      'Оплата поставщику ',
    );

    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{64}$/);
  });
});