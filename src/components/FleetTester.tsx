import { useState } from 'react';
import { Anchor, CheckCircle2, ShieldAlert } from 'lucide-react';
import { isPointFeasible, type LinearConstraint } from '../engine/linearMath';

interface FleetTesterProps {
  mode: 'merchant' | 'shipyard';
  constraints: LinearConstraint[];
  combinations?: Array<{ x: number; y: number; expectedValid: boolean }>;
  onAllCombinationsClassified?: () => void;
}

export function FleetTester({
  mode,
  constraints,
  combinations = [],
  onAllCombinationsClassified,
}: FleetTesterProps) {
  const [xVal, setXVal] = useState<number>(mode === 'merchant' ? 6 : 4);
  const [yVal, setYVal] = useState<number>(mode === 'merchant' ? 4 : 4);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  if (mode === 'merchant') {
    const spaceUsed = 2 * xVal + 3 * yVal;
    const valid = spaceUsed <= 36;
    return (
      <div className="bg-[#112236] border border-[#253F5C] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-[#F4EBD9]">
            Simulasi Gudang Marcus (36 Ruang)
          </h3>
          <p className="text-xs text-[#9FB0C4]">
            Peti A (x) butuh 2 ruang, Peti B (y) butuh 3 ruang. Uji kombinasi peti di bawah ini.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="m3-x" className="text-[#D8E1EB]">Jumlah Peti A (x)</label>
              <span className="font-math font-bold text-[#D49A2A] tabular-nums">{xVal}</span>
            </div>
            <input
              id="m3-x"
              type="range"
              min={0}
              max={20}
              value={xVal}
              onChange={(e) => setXVal(Number(e.target.value))}
              className="w-full accent-[#D49A2A] cursor-pointer"
            />
          </div>

          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2">
            <div className="flex justify-between text-xs">
              <label htmlFor="m3-y" className="text-[#D8E1EB]">Jumlah Peti B (y)</label>
              <span className="font-math font-bold text-[#2A9D8F] tabular-nums">{yVal}</span>
            </div>
            <input
              id="m3-y"
              type="range"
              min={0}
              max={15}
              value={yVal}
              onChange={(e) => setYVal(Number(e.target.value))}
              className="w-full accent-[#2A9D8F] cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-math text-[#D8E1EB]">2({xVal}) + 3({yVal}) = {spaceUsed} ruang</span>
            <span className={`font-math font-bold ${valid ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'}`}>
              Batas: 36 ruang
            </span>
          </div>
          <div className="h-3.5 w-full bg-[#13263B] rounded-full overflow-hidden border border-[#253F5C]">
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${Math.min(100, (spaceUsed / 36) * 100)}%`,
                backgroundColor: valid ? '#2A9D8F' : '#C94A38',
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs pt-1">
            {valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />
                <span className="text-[#9CF0E4]">Memenuhi kapasitas gudang Marcus (≤ 36).</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-[#C94A38]" aria-hidden="true" />
                <span className="text-[#FFC2BA]">Melebihi kapasitas gudang Marcus (&gt; 36).</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Shipyard Problem (Mission 4)
  const woodUsed = 2 * xVal + yVal;
  const ironUsed = xVal + 2 * yVal;
  const woodOk = woodUsed <= 20;
  const ironOk = ironUsed <= 16;

  const handleClassify = (combo: { x: number; y: number; expectedValid: boolean }, choice: boolean) => {
    const key = `${combo.x},${combo.y}`;
    const isActuallyValid = isPointFeasible({ x: combo.x, y: combo.y }, constraints);
    if (choice !== isActuallyValid) {
      const w = 2 * combo.x + combo.y;
      const ir = combo.x + 2 * combo.y;
      setFeedback(
        `Cek lagi (${combo.x}, ${combo.y}): Kayu = 2(${combo.x})+${combo.y} = ${w} (batas 20), Besi = ${combo.x}+2(${combo.y}) = ${ir} (batas 16).`
      );
      return;
    }

    const next = { ...answers, [key]: choice };
    setAnswers(next);
    setFeedback(null);

    if (
      combinations.length > 0 &&
      combinations.every((c) => next[`${c.x},${c.y}`] === c.expectedValid)
    ) {
      onAllCombinationsClassified?.();
    }
  };

  const solvedCount = combinations.filter(
    (c) => answers[`${c.x},${c.y}`] === c.expectedValid
  ).length;

  return (
    <div className="bg-[#112236] border border-[#253F5C] rounded-xl p-5 space-y-5">
      {/* Live Shipyard Sandbox */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-[#F4EBD9]">
            Galangan Kapal Lyra — Uji Bahan Baku
          </h3>
          <Anchor className="w-4 h-4 text-[#D49A2A]" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="ship-x" className="text-[#D8E1EB]">Kapal Kecil (x)</label>
              <span className="font-math font-bold text-[#D49A2A] tabular-nums">{xVal} unit</span>
            </div>
            <input
              id="ship-x"
              type="range"
              min={0}
              max={14}
              value={xVal}
              onChange={(e) => setXVal(Number(e.target.value))}
              className="w-full accent-[#D49A2A] cursor-pointer"
            />
          </div>
          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="ship-y" className="text-[#D8E1EB]">Kapal Besar (y)</label>
              <span className="font-math font-bold text-[#4E89AE] tabular-nums">{yVal} unit</span>
            </div>
            <input
              id="ship-y"
              type="range"
              min={0}
              max={12}
              value={yVal}
              onChange={(e) => setYVal(Number(e.target.value))}
              className="w-full accent-[#4E89AE] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs font-math">
              <span>Kayu: 2({xVal}) + {yVal}</span>
              <span className={woodOk ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'}>
                {woodUsed} / 20
              </span>
            </div>
            <div className="h-2.5 bg-[#13263B] rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${Math.min(100, (woodUsed / 20) * 100)}%`,
                  backgroundColor: woodOk ? '#2A9D8F' : '#C94A38',
                }}
              />
            </div>
          </div>

          <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs font-math">
              <span>Besi: {xVal} + 2({yVal})</span>
              <span className={ironOk ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'}>
                {ironUsed} / 16
              </span>
            </div>
            <div className="h-2.5 bg-[#13263B] rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${Math.min(100, (ironUsed / 16) * 100)}%`,
                  backgroundColor: ironOk ? '#2A9D8F' : '#C94A38',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mini Boss Table */}
      {combinations.length > 0 && (
        <div className="border-t border-[#253F5C] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-[#F4C456]">
              Mini Boss: Uji 4 Kombinasi Armada
            </h4>
            <span className="font-math text-xs text-[#9FB0C4] tabular-nums">
              {solvedCount}/{combinations.length} Teruji
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#253F5C] text-[#9FB0C4]">
                  <th className="py-2 pr-2">Kapal Kecil (x)</th>
                  <th className="py-2 px-2">Kapal Besar (y)</th>
                  <th className="py-2 px-2">Uji</th>
                  <th className="py-2 pl-2 text-right">Keputusanmu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E354E]">
                {combinations.map((c) => {
                  const key = `${c.x},${c.y}`;
                  const solved = answers[key] === c.expectedValid;
                  return (
                    <tr key={key} className="hover:bg-[#162C46]/50">
                      <td className="py-2.5 pr-2 font-math font-bold text-[#F4EBD9]">{c.x}</td>
                      <td className="py-2.5 px-2 font-math font-bold text-[#F4EBD9]">{c.y}</td>
                      <td className="py-2.5 px-2">
                        <button
                          type="button"
                          onClick={() => {
                            setXVal(c.x);
                            setYVal(c.y);
                          }}
                          className="text-[#D49A2A] hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Simulasikan
                        </button>
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        {solved ? (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              c.expectedValid ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'
                            }`}
                          >
                            {c.expectedValid ? (
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            {c.expectedValid ? 'Memenuhi' : 'Tidak Memenuhi'}
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleClassify(c, true)}
                              className="px-2.5 py-1 rounded bg-[#163839] hover:bg-[#1E4A4B] border border-[#2A9D8F]/50 text-[#9CF0E4] cursor-pointer whitespace-nowrap"
                            >
                              Memenuhi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClassify(c, false)}
                              className="px-2.5 py-1 rounded bg-[#3A1B1E] hover:bg-[#4F2327] border border-[#C94A38]/50 text-[#FFC2BA] cursor-pointer whitespace-nowrap"
                            >
                              Tidak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {feedback && (
            <div className="p-3 rounded-lg bg-[#36181A] border border-[#C94A38]/60 text-xs text-[#FFC2BA]">
              {feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
