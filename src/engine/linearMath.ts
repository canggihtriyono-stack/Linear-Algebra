export type InequalityOp = '<' | '>' | '<=' | '>=';

export interface LinearConstraint {
  id: string;
  label?: string;
  a: number;
  b: number;
  op: InequalityOp;
  rhs: number;
  color?: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ObjectiveFunction {
  px: number;
  py: number;
  goal: 'max' | 'min';
}

const EPS = 1e-9;

export function satisfiesConstraint(point: Point2D, c: LinearConstraint): boolean {
  const lhs = c.a * point.x + c.b * point.y;
  switch (c.op) {
    case '<':
      return lhs < c.rhs - EPS;
    case '>':
      return lhs > c.rhs + EPS;
    case '<=':
      return lhs <= c.rhs + EPS;
    case '>=':
      return lhs >= c.rhs - EPS;
  }
}

export function isPointFeasible(point: Point2D, constraints: LinearConstraint[]): boolean {
  if (point.x < -EPS || point.y < -EPS) {
    return false;
  }
  return constraints.every((c) => satisfiesConstraint(point, c));
}

export function intersectLines(c1: LinearConstraint, c2: LinearConstraint): Point2D | null {
  const det = c1.a * c2.b - c2.a * c1.b;
  if (Math.abs(det) < EPS) {
    return null;
  }
  const x = (c1.rhs * c2.b - c2.rhs * c1.b) / det;
  const y = (c1.a * c2.rhs - c2.a * c1.rhs) / det;
  return {
    x: Math.abs(x) < EPS ? 0 : Number(x.toFixed(6)),
    y: Math.abs(y) < EPS ? 0 : Number(y.toFixed(6)),
  };
}

export function findCornerPoints(constraints: LinearConstraint[]): Point2D[] {
  const allBounds: LinearConstraint[] = [
    ...constraints,
    { id: '_x_nonneg', a: 1, b: 0, op: '>=', rhs: 0 },
    { id: '_y_nonneg', a: 0, b: 1, op: '>=', rhs: 0 },
  ];

  const candidates: Point2D[] = [];
  for (let i = 0; i < allBounds.length; i++) {
    for (let j = i + 1; j < allBounds.length; j++) {
      const pt = intersectLines(allBounds[i], allBounds[j]);
      if (pt && isPointFeasible(pt, allBounds)) {
        const exists = candidates.some(
          (c) => Math.abs(c.x - pt.x) < 1e-5 && Math.abs(c.y - pt.y) < 1e-5
        );
        if (!exists) {
          candidates.push({
            x: Number(pt.x.toFixed(4)),
            y: Number(pt.y.toFixed(4)),
          });
        }
      }
    }
  }

  return orderPolygonVertices(candidates);
}

export function orderPolygonVertices(points: Point2D[]): Point2D[] {
  if (points.length <= 2) return points;
  const cx = points.reduce((acc, p) => acc + p.x, 0) / points.length;
  const cy = points.reduce((acc, p) => acc + p.y, 0) / points.length;
  return [...points].sort((p1, p2) => {
    const a1 = Math.atan2(p1.y - cy, p1.x - cx);
    const a2 = Math.atan2(p2.y - cy, p2.x - cx);
    return a1 - a2;
  });
}

export function computeClippedFeasiblePolygon(
  constraints: LinearConstraint[],
  maxX: number,
  maxY: number
): Point2D[] {
  const clippedBounds: LinearConstraint[] = [
    ...constraints,
    { id: '_clip_x_max', a: 1, b: 0, op: '<=', rhs: maxX },
    { id: '_clip_y_max', a: 0, b: 1, op: '<=', rhs: maxY },
  ];
  return findCornerPoints(clippedBounds);
}

export function evaluateObjective(point: Point2D, obj: ObjectiveFunction): number {
  return Number((obj.px * point.x + obj.py * point.y).toFixed(4));
}

export function findOptimalCorner(
  corners: Point2D[],
  obj: ObjectiveFunction
): { point: Point2D; value: number } | null {
  if (corners.length === 0) return null;
  let bestPoint = corners[0];
  let bestVal = evaluateObjective(bestPoint, obj);

  for (let i = 1; i < corners.length; i++) {
    const val = evaluateObjective(corners[i], obj);
    if (obj.goal === 'max' ? val > bestVal : val < bestVal) {
      bestVal = val;
      bestPoint = corners[i];
    }
  }
  return { point: bestPoint, value: bestVal };
}

export function formatConstraint(c: Pick<LinearConstraint, 'a' | 'b' | 'op' | 'rhs'>): string {
  const opSymbol = c.op === '<=' ? '≤' : c.op === '>=' ? '≥' : c.op;
  const terms: string[] = [];

  if (c.a !== 0) {
    if (c.a === 1) terms.push('x');
    else if (c.a === -1) terms.push('-x');
    else terms.push(`${c.a}x`);
  }

  if (c.b !== 0) {
    const absB = Math.abs(c.b);
    const bTerm = absB === 1 ? 'y' : `${absB}y`;
    if (terms.length === 0) {
      terms.push(c.b < 0 ? `-${bTerm}` : bTerm);
    } else {
      terms.push(c.b < 0 ? `- ${bTerm}` : `+ ${bTerm}`);
    }
  }

  if (terms.length === 0) terms.push('0');
  return `${terms.join(' ')} ${opSymbol} ${c.rhs}`;
}

export function parseLinearConstraintInput(
  raw: string
): { a: number; b: number; op: InequalityOp; rhs: number } | null {
  const normalized = raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .toLowerCase();

  const opMatch = normalized.match(/(<=|>=|<|>)/);
  if (!opMatch) return null;
  const op = opMatch[1] as InequalityOp;
  const parts = normalized.split(op);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [lhsStr, rhsStr] = parts;
  const rhs = Number(rhsStr);
  if (!Number.isFinite(rhs)) return null;

  const coeffs = parseLinearExpression(lhsStr);
  if (!coeffs) return null;

  return { a: coeffs.px, b: coeffs.py, op, rhs };
}

export function parseLinearExpression(
  raw: string
): { px: number; py: number } | null {
  let expr = raw
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();

  // Strip optional "z=" prefix
  if (expr.startsWith('z=')) {
    expr = expr.slice(2);
  }
  if (!expr) return null;

  // Tokenize into signed terms like +2x, -3y, x
  const normalized = expr.startsWith('+') || expr.startsWith('-') ? expr : `+${expr}`;
  const terms = normalized.match(/[+-][^+-]+/g);
  if (!terms || terms.join('') !== normalized) return null;

  let px = 0;
  let py = 0;

  for (const term of terms) {
    if (term.endsWith('x')) {
      const coeffStr = term.slice(0, -1);
      const val =
        coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : Number(coeffStr);
      if (!Number.isFinite(val)) return null;
      px += val;
    } else if (term.endsWith('y')) {
      const coeffStr = term.slice(0, -1);
      const val =
        coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : Number(coeffStr);
      if (!Number.isFinite(val)) return null;
      py += val;
    } else {
      return null;
    }
  }

  return { px, py };
}

export function isSameConstraint(
  input: { a: number; b: number; op: InequalityOp; rhs: number },
  expected: { a: number; b: number; op: InequalityOp; rhs: number }
): boolean {
  if (input.op !== expected.op) return false;
  // Allow positive scalar multiples (e.g., 4x + 6y <= 120 matches 2x + 3y <= 60)
  const factor =
    expected.a !== 0
      ? input.a / expected.a
      : expected.b !== 0
      ? input.b / expected.b
      : 1;
  if (!(factor > 0)) return false;
  return (
    Math.abs(input.a - expected.a * factor) < EPS &&
    Math.abs(input.b - expected.b * factor) < EPS &&
    Math.abs(input.rhs - expected.rhs * factor) < EPS
  );
}

export function evaluateReflectionAnswer(text: string, keywords: string[]): {
  valid: boolean;
  feedback: string;
} {
  const clean = text.trim().toLowerCase();
  if (clean.length < 18) {
    return {
      valid: false,
      feedback: 'Tuliskan penjelasan yang lebih lengkap (minimal 18 karakter) agar Orion dapat memahami alasanmu.',
    };
  }
  const matched = keywords.filter((kw) => clean.includes(kw.toLowerCase()));
  if (matched.length === 0) {
    return {
      valid: false,
      feedback:
        'Coba hubungkan penjelasanmu dengan apakah batas angka tersebut ikut diperbolehkan (sama dengan) atau tidak boleh disentuh.',
    };
  }
  return {
    valid: true,
    feedback:
      'Refleksi tajam, Kapten! Pada "maksimal 30" (≤), angka 30 masih diperbolehkan karena ada tanda sama dengan. Pada "kurang dari 30" (<), batasnya berhenti tepat sebelum 30.',
  };
}
