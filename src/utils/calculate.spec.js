import { describe, it, expect } from 'vitest';
import {
  sumArrayAttribute,
  computeFoodItemCosts,
  calculatePairwisePayments,
  calculateLeastTransactionPayments,
} from './calculate.js';

function makePerson(overrides = {}) {
  return {
    name: 'Person',
    hasSVC: false,
    hasGST: false,
    arrFoodItems: [],
    ...overrides,
  };
}

function makeFoodItem(overrides = {}) {
  return {
    food: 'Item',
    cost: 0,
    arrShare: [],
    per: 0,
    totalCost: 0,
    ...overrides,
  };
}

describe('sumArrayAttribute', () => {
  it('sums the given numeric property across items', () => {
    const items = [{ totalCost: 10 }, { totalCost: 5.5 }, { totalCost: 2 }];
    expect(sumArrayAttribute(items, 'totalCost')).toBe(17.5);
  });

  it('returns 0 for an empty list', () => {
    expect(sumArrayAttribute([], 'totalCost')).toBe(0);
  });
});

describe('computeFoodItemCosts', () => {
  it('splits cost evenly among sharers with no SVC/GST', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [0, 1] })] }),
      makePerson(),
    ];

    computeFoodItemCosts(persons, 0, 0);

    const item = persons[0].arrFoodItems[0];
    expect(item.per).toBe(10);
    expect(item.totalCost).toBe(20);
  });

  it('applies SVC then GST (GST computed on cost + SVC) only when the payer has them enabled', () => {
    const persons = [
      makePerson({
        hasSVC: true,
        hasGST: true,
        arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [0, 1] })],
      }),
      makePerson(),
    ];

    computeFoodItemCosts(persons, 10, 9); // 10% SVC, 9% GST

    const item = persons[0].arrFoodItems[0];
    // per-sharer base = 20 / 2 = 10
    // svc = 10% of 10 = 1
    // gst = 9% of (10 + 1) = 0.99
    expect(item.per).toBeCloseTo(11.99, 5);
    expect(item.totalCost).toBeCloseTo(23.98, 5);
  });

  it('does not apply SVC/GST when the payer has them disabled, even with nonzero rates', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [0, 1] })] }),
    ];

    computeFoodItemCosts(persons, 10, 9);

    expect(persons[0].arrFoodItems[0].per).toBe(10);
  });

  it('splits cost across any number of sharers, not just two', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 30, arrShare: [0, 1, 2] })] }),
    ];

    computeFoodItemCosts(persons, 0, 0);

    expect(persons[0].arrFoodItems[0].per).toBe(10);
    expect(persons[0].arrFoodItems[0].totalCost).toBe(30);
  });

  it('falls back to the raw cost for totalCost when no sharers are selected, and leaves per untouched', () => {
    const persons = [
      makePerson({
        hasSVC: true,
        hasGST: true,
        arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [], per: 0 })],
      }),
    ];

    computeFoodItemCosts(persons, 10, 9);

    const item = persons[0].arrFoodItems[0];
    expect(item.totalCost).toBe(20);
    expect(item.per).toBe(0); // per is computed locally but never written back for unshared items
  });
});

describe('calculatePairwisePayments', () => {
  it('has the person sharing an item owe the person who paid for it', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [0, 1] })] }),
      makePerson(),
    ];

    const matrix = calculatePairwisePayments(persons, 0, 0);

    expect(matrix[1][0]).toBe(10); // person 1 owes person 0
    expect(matrix[0][1]).toBe(0);
  });

  it('sums debts from multiple items paid by the same person', () => {
    const persons = [
      makePerson({
        arrFoodItems: [
          makeFoodItem({ cost: 20, arrShare: [0, 1, 2] }),
          makeFoodItem({ cost: 30, arrShare: [0, 2] }),
        ],
      }),
      makePerson(),
      makePerson(),
    ];

    const matrix = calculatePairwisePayments(persons, 0, 0);

    expect(matrix[1][0]).toBeCloseTo(20 / 3, 5);
    expect(matrix[2][0]).toBeCloseTo(20 / 3 + 15, 5);
  });

  it('nets mutual debts down to a single direction', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [0, 1] })] }), // person 1 owes person 0: 10
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 10, arrShare: [0, 1] })] }), // person 0 owes person 1: 5
    ];

    const matrix = calculatePairwisePayments(persons, 0, 0);

    expect(matrix[1][0]).toBe(5); // net: person 1 still owes person 0
    expect(matrix[0][1]).toBe(0);
  });

  it('excludes the payer from owing themselves even when included in the share', () => {
    const persons = [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 30, arrShare: [0, 1, 2] })] }),
      makePerson(),
      makePerson(),
    ];

    const matrix = calculatePairwisePayments(persons, 0, 0);

    expect(matrix[0][0]).toBe(0);
  });
});

describe('calculateLeastTransactionPayments', () => {
  it('produces the same net amount owed per person as the pairwise calculation, using fewer transactions', () => {
    // Person 0 pays for lunch (30) shared by all three.
    // Person 1 pays for dinner (20) shared by persons 1 and 2.
    const buildPersons = () => [
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 30, arrShare: [0, 1, 2] })] }),
      makePerson({ arrFoodItems: [makeFoodItem({ cost: 20, arrShare: [1, 2] })] }),
      makePerson(),
    ];

    const pairwise = calculatePairwisePayments(buildPersons(), 0, 0);
    const leastTrx = calculateLeastTransactionPayments(buildPersons(), 0, 0);

    // Net balance = amount owed *to* this person minus amount owed *by* them.
    function netBalance(matrix, personIndex) {
      const owedToThem = matrix.reduce((sum, row) => sum + row[personIndex], 0);
      const owedByThem = sumArrayAttribute(
        matrix[personIndex].map((amount) => ({ amount })),
        'amount'
      );
      return owedToThem - owedByThem;
    }

    // Routing through a banker must preserve each person's overall net balance.
    for (let i = 0; i < 3; i++) {
      expect(netBalance(leastTrx, i)).toBeCloseTo(netBalance(pairwise, i), 5);
    }

    // Pairwise netting needs 3 separate transactions...
    const pairwiseTransactionCount = pairwise.flat().filter((amount) => amount > 0).length;
    expect(pairwiseTransactionCount).toBe(3);

    // ...while routing through a banker settles it in fewer.
    const leastTrxTransactionCount = leastTrx.flat().filter((amount) => amount > 0).length;
    expect(leastTrxTransactionCount).toBeLessThan(pairwiseTransactionCount);
    expect(leastTrxTransactionCount).toBe(1);
    expect(leastTrx[2][0]).toBe(20); // person 2 (banker) pays person 0 directly
  });

  it('results in no payments when nobody owes anything', () => {
    const persons = [makePerson(), makePerson(), makePerson()];

    const matrix = calculateLeastTransactionPayments(persons, 0, 0);

    expect(matrix.flat().every((amount) => amount === 0)).toBe(true);
  });
});
