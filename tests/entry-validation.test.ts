import test from 'node:test';
import assert from 'node:assert/strict';
import { expenseSchema, hotspotSaleSchema } from '../src/types/schemas';

/**
 * Server actions are public endpoints: the browser form is not a trust
 * boundary. These cover the values a tampered request could send that the
 * actions previously wrote to the database unchecked.
 */

const validExpense = {
  type: 'MISC',
  description: 'Tea and snacks',
  amount: 250,
  date: '2026-08-01',
};

const validSale = {
  package: 'SEVEN_DAY',
  quantity: 2,
  date: '2026-08-01',
};

test('accepts a well-formed expense', () => {
  assert.equal(expenseSchema.safeParse(validExpense).success, true);
});

test('rejects non-positive and non-finite expense amounts', () => {
  for (const amount of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = expenseSchema.safeParse({ ...validExpense, amount });
    assert.equal(result.success, false, `expected amount ${amount} to be rejected`);
  }
});

test('rejects an expense with a blank description', () => {
  assert.equal(expenseSchema.safeParse({ ...validExpense, description: '   ' }).success, false);
});

test('trims the expense description', () => {
  const result = expenseSchema.safeParse({ ...validExpense, description: '  Tea  ' });
  assert.equal(result.success && result.data.description, 'Tea');
});

test('rejects an expense with an unknown category', () => {
  assert.equal(expenseSchema.safeParse({ ...validExpense, type: 'BRIBE' }).success, false);
});

test('rejects an expense with a malformed or impossible date', () => {
  for (const date of ['', 'yesterday', '2026-13-01', '2026-02-31', '01-08-2026']) {
    assert.equal(
      expenseSchema.safeParse({ ...validExpense, date }).success,
      false,
      `expected date ${date} to be rejected`
    );
  }
});

test('accepts a well-formed hotspot sale', () => {
  assert.equal(hotspotSaleSchema.safeParse(validSale).success, true);
});

test('rejects an unknown hotspot package', () => {
  // Previously this reached `HOTSPOT_PACKAGES[key].price` and threw.
  assert.equal(hotspotSaleSchema.safeParse({ ...validSale, package: 'FREE_FOREVER' }).success, false);
});

test('rejects zero, negative and fractional quantities', () => {
  for (const quantity of [0, -5, 1.5, Number.NaN]) {
    assert.equal(
      hotspotSaleSchema.safeParse({ ...validSale, quantity }).success,
      false,
      `expected quantity ${quantity} to be rejected`
    );
  }
});

test('rejects a negative discount', () => {
  // A negative discount used to *raise* the recorded amount above list price.
  assert.equal(hotspotSaleSchema.safeParse({ ...validSale, discount: -500 }).success, false);
});

test('accepts an omitted discount', () => {
  const result = hotspotSaleSchema.safeParse(validSale);
  assert.equal(result.success && result.data.discount, undefined);
});
