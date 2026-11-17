import { useMemo, useState } from 'react';
import {
  computeClippedFeasiblePolygon,
  evaluateObjective,
  isPointFeasible,
  type LinearConstraint,
  type ObjectiveFunction,
  type Point2D,
} from '../engine/linearMath';

interface PlottedPoint {
  point: Point2D;
  label: string;
  status?: 'valid' | 'invalid' | 'neutral';
}

interface CartesianExplorerProps {
  constraints: LinearConstraint[];
  maxAxis: number;
  xLabel?: string;
  yLabel?: string;
  plottedPoints?: PlottedPoint[];
  showFeasibleRegion?: boolean;
  selectableCorners?: Point2D[];
  selectedCorners?: Point2D[];
  onToggleCorner?: (pt: Point2D) => void;
  objective?: ObjectiveFunction;
  optimalPoint?: Point2D;
  optimalValue?: number;
  allowClickInspect?: boolean;
  hideConstraints?: boolean;
}

const SVG_W = 500;
const SVG_H = 380;
const PAD_L = 48;
const PAD_R = 24;
const PAD_T = 20;
const PAD_B = 42;

export function CartesianExplorer({
  constraints,
  maxAxis,
  xLabel = 'x',
  yLabel = 'y',
  plottedPoints = [],
  showFeasibleRegion = true,
  selectableCorners,
  selectedCorners = [],
  onToggleCorner,
  objective,
  optimalPoint,
  optimalValue,
  allowClickInspect = true,
  hideConstraints = false,
}: CartesianExplorerProps) {
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const [inspectedPoint, setInspectedPoint] = useState<Point2D | null>(null);
  const [sweepZ, setSweepZ] = useState<number>(() =>
    objective ? (objective.goal === 'min' ? 24 : 20) : 0
  );

  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;

  const toSvgX = (x: number) => PAD_L + (x / maxAxis) * plotW;
  const toSvgY = (y: number) => PAD_T + plotH - (y / maxAxis) * plotH;

  const activeConstraints = useMemo(
    () =>
      hideConstraints
        ? []
        : constraints.filter((c) => visibleMap[c.id] !== false),
    [constraints, visibleMap, hideConstraints]
  );

  const feasiblePolygon = useMemo(() => {
    if (!showFeasibleRegion || activeConstraints.length === 0) return [];
    return computeClippedFeasiblePolygon(activeConstraints, maxAxis, maxAxis);
  }, [activeConstraints, maxAxis, showFeasibleRegion]);

  const polygonPointsAttr = useMemo(
    () =>
      feasiblePolygon
        .map((p) => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`)
        .join(' '),
    [feasiblePolygon, maxAxis]
  );

  // Build line endpoints inside [0, maxAxis] x [0, maxAxis]
  const getLineSegment = (a: number, b: number, rhs: number) => {
    const pts: Point2D[] = [];
    if (Math.abs(b) > 1e-9) {
      const yAt0 = rhs / b;
      if (yAt0 >= -0.01 && yAt0 <= maxAxis + 0.01) pts.push({ x: 0, y: Math.max(0, Math.min(maxAxis, yAt0)) });
      const yAtMax = (rhs - a * maxAxis) / b;
      if (yAtMax >= -0.01 && yAtMax <= maxAxis + 0.01) pts.push({ x: maxAxis, y: Math.max(0, Math.min(maxAxis, yAtMax)) });
    }
    if (Math.abs(a) > 1e-9) {
      const xAt0 = rhs / a;
      if (xAt0 >= -0.01 && xAt0 <= maxAxis + 0.01) pts.push({ x: Math.max(0, Math.min(maxAxis, xAt0)), y: 0 });
      const xAtMax = (rhs - b * maxAxis) / a;
      if (xAtMax >= -0.01 && xAtMax <= maxAxis + 0.01) pts.push({ x: Math.max(0, Math.min(maxAxis, xAtMax)), y: maxAxis });
    }
    // Deduplicate
    const unique: Point2D[] = [];
    for (const p of pts) {
      if (!unique.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 1e-3)) {
        unique.push(p);
      }
    }
    return unique.length >= 2 ? [unique[0], unique[1]] : null;
  };

  const stepTick = maxAxis <= 12 ? 1 : 2;
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let v = 0; v <= maxAxis; v += stepTick) arr.push(v);
    return arr;
  }, [maxAxis, stepTick]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!allowClickInspect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const scaleY = SVG_H / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    const rawX = ((sx - PAD_L) / plotW) * maxAxis;
    const rawY = ((PAD_T + plotH - sy) / plotH) * maxAxis;
    if (rawX < -0.5 || rawY < -0.5 || rawX > maxAxis + 0.5 || rawY > maxAxis + 0.5) return;

    const snapped: Point2D = {
      x: Math.max(0, Math.min(maxAxis, Math.round(rawX))),
      y: Math.max(0, Math.min(maxAxis, Math.round(rawY))),
    };
    setInspectedPoint(snapped);
  };

  const maxZSlider = objective
    ? Math.max(48, Math.ceil((objective.px + objective.py) * maxAxis * 0.7))
    : 50;

  const sweepLine = objective ? getLineSegment(objective.px, objective.py, sweepZ) : null;

  return (
    <div className="bg-[#102033] border border-[#253F5C] rounded-xl p-4 space-y-3">
      {/* Constraint Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {hideConstraints ? (
            <span className="text-xs text-[#D49A2A] font-medium">
              Peta Siap — Verifikasi model matematika di sebelah kanan untuk memetakan garis batas.
            </span>
          ) : (
            constraints.map((c) => {
              const visible = visibleMap[c.id] !== false;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setVisibleMap((prev) => ({ ...prev, [c.id]: !visible }))
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-math border transition-colors cursor-pointer whitespace-nowrap ${
                    visible
                      ? 'bg-[#0B1726] border-[#38577A] text-[#F4EBD9]'
                      : 'bg-[#0B1726]/40 border-[#1E354E] text-[#6B8199] line-through'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: c.color || '#D49A2A' }}
                    aria-hidden="true"
                  />
                  {c.label}
                </button>
              );
            })
          )}
        </div>

        <span className="text-[11px] text-[#9FB0C4]">
          {hideConstraints
            ? ''
            : selectableCorners
            ? 'Klik titik kandidat pada peta'
            : allowClickInspect
            ? 'Klik area grafik untuk uji koordinat'
            : ''}
        </span>
      </div>

      {/* SVG Coordinate Plane */}
      <div className="w-full bg-[#091422] border border-[#1E354E] rounded-lg overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-auto block select-none cursor-crosshair"
          onClick={handleSvgClick}
          role="img"
          aria-label="Peta Koordinat Program Linear"
        >
          {/* Grid Lines */}
          {ticks.map((t) => (
            <g key={`grid-${t}`}>
              <line
                x1={toSvgX(t)}
                y1={PAD_T}
                x2={toSvgX(t)}
                y2={PAD_T + plotH}
                stroke="#162B42"
                strokeWidth="1"
              />
              <line
                x1={PAD_L}
                y1={toSvgY(t)}
                x2={PAD_L + plotW}
                y2={toSvgY(t)}
                stroke="#162B42"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Feasible Region Polygon */}
          {feasiblePolygon.length >= 3 && (
            <polygon
              points={polygonPointsAttr}
              fill="rgba(42, 157, 143, 0.26)"
              stroke="#2A9D8F"
              strokeWidth="1.5"
            />
          )}

          {/* Individual Constraint Lines */}
          {activeConstraints.map((c) => {
            const seg = getLineSegment(c.a, c.b, c.rhs);
            if (!seg) return null;
            return (
              <line
                key={`line-${c.id}`}
                x1={toSvgX(seg[0].x)}
                y1={toSvgY(seg[0].y)}
                x2={toSvgX(seg[1].x)}
                y2={toSvgY(seg[1].y)}
                stroke={c.color || '#D49A2A'}
                strokeWidth="2.5"
              />
            );
          })}

          {/* Objective Iso-Profit / Cost Sweeper Line */}
          {!hideConstraints && objective && sweepLine && (
            <line
              x1={toSvgX(sweepLine[0].x)}
              y1={toSvgY(sweepLine[0].y)}
              x2={toSvgX(sweepLine[1].x)}
              y2={toSvgY(sweepLine[1].y)}
              stroke="#F4C456"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}

          {/* Axes */}
          <line
            x1={PAD_L}
            y1={PAD_T + plotH}
            x2={PAD_L + plotW + 8}
            y2={PAD_T + plotH}
            stroke="#6C85A3"
            strokeWidth="1.8"
          />
          <line
            x1={PAD_L}
            y1={PAD_T - 8}
            x2={PAD_L}
            y2={PAD_T + plotH}
            stroke="#6C85A3"
            strokeWidth="1.8"
          />

          {/* Axis Ticks & Labels */}
          {ticks.map((t) => (
            <g key={`tick-${t}`}>
              <text
                x={toSvgX(t)}
                y={PAD_T + plotH + 16}
                textAnchor="middle"
                fill="#8FA4BC"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {t}
              </text>
              {t > 0 && (
                <text
                  x={PAD_L - 8}
                  y={toSvgY(t) + 3.5}
                  textAnchor="end"
                  fill="#8FA4BC"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t}
                </text>
              )}
            </g>
          ))}

          {/* Axis Titles */}
          <text
            x={PAD_L + plotW / 2}
            y={SVG_H - 6}
            textAnchor="middle"
            fill="#D8E1EB"
            fontSize="11"
            fontWeight="600"
          >
            {xLabel}
          </text>
          <text
            x={14}
            y={PAD_T + plotH / 2}
            textAnchor="middle"
            fill="#D8E1EB"
            fontSize="11"
            fontWeight="600"
            transform={`rotate(-90 14 ${PAD_T + plotH / 2})`}
          >
            {yLabel}
          </text>

          {/* Plotted Static / Quiz Points */}
          {plottedPoints.map((item, idx) => {
            const cx = toSvgX(item.point.x);
            const cy = toSvgY(item.point.y);
            const fill =
              item.status === 'valid'
                ? '#2A9D8F'
                : item.status === 'invalid'
                ? '#C94A38'
                : '#D49A2A';
            return (
              <g key={`pt-${idx}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={fill}
                  stroke="#091422"
                  strokeWidth="2"
                />
                <rect
                  x={cx + 8}
                  y={cy - 18}
                  width={Math.max(46, item.label.length * 6.5)}
                  height="18"
                  rx="4"
                  fill="rgba(9, 20, 34, 0.88)"
                  stroke={fill}
                  strokeWidth="1"
                />
                <text
                  x={cx + 12}
                  y={cy - 6}
                  fill="#F4EBD9"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* Selectable Corner Candidates */}
          {selectableCorners?.map((pt) => {
            const isSelected = selectedCorners.some(
              (s) => s.x === pt.x && s.y === pt.y
            );
            const cx = toSvgX(pt.x);
            const cy = toSvgY(pt.y);
            return (
              <g
                key={`cand-${pt.x}-${pt.y}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCorner?.(pt);
                }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 9 : 7}
                  fill={isSelected ? '#D49A2A' : '#162C46'}
                  stroke={isSelected ? '#FFF4D6' : '#D49A2A'}
                  strokeWidth="2"
                />
                <text
                  x={cx + 10}
                  y={cy - 8}
                  fill={isSelected ? '#F4C456' : '#B8C6D6'}
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ({pt.x},{pt.y})
                </text>
              </g>
            );
          })}

          {/* Inspected User Click Point */}
          {inspectedPoint && (
            <g>
              <circle
                cx={toSvgX(inspectedPoint.x)}
                cy={toSvgY(inspectedPoint.y)}
                r="6"
                fill={
                  isPointFeasible(inspectedPoint, constraints)
                    ? '#2A9D8F'
                    : '#C94A38'
                }
                stroke="#FFF4D6"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Live Inspected Coordinate Bar */}
      {inspectedPoint && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B1726] border border-[#253F5C] text-xs">
          <span className="font-math text-[#F4EBD9]">
            Titik Uji: ({inspectedPoint.x}, {inspectedPoint.y})
          </span>
          <span
            className={`font-medium ${
              isPointFeasible(inspectedPoint, constraints)
                ? 'text-[#9CF0E4]'
                : 'text-[#FFC2BA]'
            }`}
          >
            {isPointFeasible(inspectedPoint, constraints)
              ? 'MEMENUHI daerah penyelesaian'
              : 'DI LUAR daerah penyelesaian'}
            {objective
              ? ` · Z = ${evaluateObjective(inspectedPoint, objective)}`
              : ''}
          </span>
        </div>
      )}

      {/* Objective Line Sweeper Control (Chapters 4 & 5) */}
      {!hideConstraints && objective && (
        <div className="bg-[#0B1726] border border-[#253F5C] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="iso-sweep" className="text-[#D8E1EB] font-medium">
              Geser Garis Fungsi Objektif (<span className="font-math">Z = {objective.px}x + {objective.py}y</span>):
            </label>
            <span className="font-math font-bold text-[#F4C456] tabular-nums">
              Z = {sweepZ}
              {optimalValue !== undefined && sweepZ === optimalValue && optimalPoint
                ? ` (Optimum di (${optimalPoint.x}, ${optimalPoint.y})!)`
                : ''}
            </span>
          </div>
          <input
            id="iso-sweep"
            type="range"
            min={0}
            max={maxZSlider}
            step={1}
            value={sweepZ}
            onChange={(e) => setSweepZ(Number(e.target.value))}
            className="w-full accent-[#D49A2A] cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
