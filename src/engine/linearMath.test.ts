import test from 'node:test';
import assert from 'node:assert/strict';
import {
  satisfiesConstraint,
  isPointFeasible,
  intersectLines,
  findCornerPoints,
  findOptimalCorner,
  parseLinearConstraintInput,
  parseLinearExpression,
  isSameConstraint,
  evaluateReflectionAnswer,
  type LinearConstraint,
} from './linearMath';

test('Chapter 1 & 2: single and multi-variable constraint satisfaction', () => {
  const cap: LinearConstraint = { id: 'cap', a: 2, b: 3, op: '<=', rhs: 60 };
  assert.equal(satisfiesConstraint({ x: 15, y: 10 }, cap), true);
  assert.equal(satisfiesConstraint({ x: 16, y: 10 }, cap), false);

  const strict: LinearConstraint = { id: 'strict', a: 1, b: 0, op: '<', rhs: 30 };
  assert.equal(satisfiesConstraint({ x: 30, y: 0 }, strict), false);
  assert.equal(satisfiesConstraint({ x: 29, y: 0 }, strict), true);
});

test('Chapter 2 Mission 4: shipyard fleet combinations', () => {
  const constraints: LinearConstraint[] = [
    { id: 'wood', a: 2, b: 1, op: '<=', rhs: 20 },
    { id: 'iron', a: 1, b: 2, op: '<=', rhs: 16 },
  ];
  assert.equal(isPointFeasible({ x: 2, y: 3 }, constraints), true);
  assert.equal(isPointFeasible({ x: 4, y: 4 }, constraints), true);
  assert.equal(isPointFeasible({ x: 8, y: 2 }, constraints), true);
  assert.equal(isPointFeasible({ x: 10, y: 5 }, constraints), false);
});

test('Chapter 3 & 4: Mission 7 & 9 intersection, corner points, and max profit', () => {
  const constraints: LinearConstraint[] = [
    { id: 'c1', a: 1, b: 1, op: '<=', rhs: 8 },
    { id: 'c2', a: 2, b: 1, op: '<=', rhs: 10 },
  ];
  const inter = intersectLines(constraints[0], constraints[1]);
  assert.deepEqual(inter, { x: 2, y: 6 });

  const corners = findCornerPoints(constraints);
  assert.equal(corners.length, 4);
  const opt = findOptimalCorner(corners, { px: 3, py: 5, goal: 'max' });
  assert.deepEqual(opt, { point: { x: 0, y: 8 }, value: 40 });
});

test('Chapter 4 Mission 10: minimum cost on unbounded region', () => {
  const constraints: LinearConstraint[] = [
    { id: 'm1', a: 1, b: 1, op: '>=', rhs: 6 },
    { id: 'm2', a: 1, b: 2, op: '>=', rhs: 8 },
  ];
  const corners = findCornerPoints(constraints);
  assert.equal(corners.length, 3);
  const opt = findOptimalCorner(corners, { px: 4, py: 3, goal: 'min' });
  assert.deepEqual(opt, { point: { x: 0, y: 6 }, value: 18 });
});

test('Chapter 5 Mission 11 & 12: final battle optimization', () => {
  const m11: LinearConstraint[] = [
    { id: 'wood', a: 2, b: 1, op: '<=', rhs: 20 },
    { id: 'iron', a: 1, b: 2, op: '<=', rhs: 16 },
  ];
  const corners11 = findCornerPoints(m11);
  const opt11 = findOptimalCorner(corners11, { px: 3, py: 5, goal: 'max' });
  assert.deepEqual(opt11, { point: { x: 8, y: 4 }, value: 44 });

  const m12: LinearConstraint[] = [
    { id: 'powder', a: 3, b: 1, op: '<=', rhs: 18 },
    { id: 'cannon', a: 1, b: 2, op: '<=', rhs: 16 },
  ];
  const corners12 = findCornerPoints(m12);
  const opt12 = findOptimalCorner(corners12, { px: 5, py: 4, goal: 'max' });
  assert.deepEqual(opt12, { point: { x: 4, y: 6 }, value: 44 });
});

test('Parsers: inequality and objective function strings', () => {
  const parsed = parseLinearConstraintInput('2x + 3y ≤ 60');
  assert.ok(parsed);
  assert.equal(
    isSameConstraint(parsed, { a: 2, b: 3, op: '<=', rhs: 60 }),
    true
  );

  const obj = parseLinearExpression('Z = 3x + 5y');
  assert.deepEqual(obj, { px: 3, py: 5 });

  const goodReflection = evaluateReflectionAnswer(
    'Maksimal 30 berarti angka 30 boleh dibawa karena ada sama dengan, sedangkan kurang dari 30 tidak boleh.',
    ['boleh', 'sama dengan', 'tidak']
  );
  assert.equal(goodReflection.valid, true);
});
