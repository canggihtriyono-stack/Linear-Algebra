import { useState } from 'react';
import { CheckCircle2, Package, ShieldAlert } from 'lucide-react';
import { satisfiesConstraint, type InequalityOp } from '../engine/linearMath';

interface InequalityPlaygroundProps {
  missionId: number;
}

export function InequalityPlayground({ missionId }: InequalityPlaygroundProps) {
  // Mission 1: single variable boundary explorer
  const [op, setOp] = useState<InequalityOp>('≤' as unknown as InequalityOp);
  const [activeOp, setActiveOp] = useState<InequalityOp>('<=');
  const [crates, setCrates] = useState<number>(20);

  // Mission 2: two variable ship capacity simulator (2x + 3y <= 60)
  const [foodX, setFoodX] = useState<number>(5);
  const [waterY, setWaterY] = useState<number>(4);

  if (missionId === 1) {
    const limit = 20;
    const isValid = satisfiesConstraint(
      { x: crates, y: 0 },
      { id: 'sim', a: 1, b: 0, op: activeOp, rhs: limit }
    );

    const ops: Array<{ value: InequalityOp; label: string; desc: string }> = [
      { value: '<', label: 'x < 20', desc: 'Kurang dari 20 (20 dilarang)' },
      { value: '<=', label: 'x ≤ 20', desc: 'Maksimal 20 (20 boleh)' },
      { value: '>', label: 'x > 20', desc: 'Lebih dari 20 (20 dilarang)' },
      { value: '>=', label: 'x ≥ 20', desc: 'Minimal 20 (20 boleh)' },
    ];

    void op;
    void setOp;

    return (
      <div className="bg-[#112236] border border-[#253F5C] rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#F4EBD9]">
              Simulator Batas Muatan Kerajaan
            </h3>
            <p className="text-xs text-[#9FB0C4]">
              Pilih tanda pertidaksamaan dan geser jumlah peti tepat ke angka 20 untuk melihat bedanya.
            </p>
          </div>
          <span className="font-math text-sm font-bold px-3 py-1 rounded bg-[#0B1726] border border-[#2C4766] text-[#D49A2A] whitespace-nowrap">
            Batas = {limit}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ops.map((item) => {
            const active = activeOp === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setActiveOp(item.value)}
                className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D49A2A] text-[#0B1726] border-[#F4C456] font-bold'
                    : 'bg-[#0D1A2B] text-[#E4ECF5] border-[#253F5C] hover:border-[#D49A2A]/50'
                }`}
              >
                <div className="font-math text-sm">{item.label}</div>
                <div className={`text-[11px] mt-0.5 ${active ? 'text-[#0B1726]/85' : 'text-[#8FA4BC]'}`}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="crate-slider" className="text-[#D8E1EB] font-medium">
              Jumlah Peti di Kapal (x):
            </label>
            <span className="font-math text-lg font-bold text-[#F4C456] tabular-nums">
              {crates} peti
            </span>
          </div>
          <input
            id="crate-slider"
            type="range"
            min={0}
            max={35}
            value={crates}
            onChange={(e) => setCrates(Number(e.target.value))}
            className="w-full accent-[#D49A2A] cursor-pointer"
          />

          {/* Number Line Bar */}
          <div className="relative h-9 bg-[#13263B] rounded-md overflow-hidden border border-[#253F5C] flex items-center px-3">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-150"
              style={{
                width: `${(crates / 35) * 100}%`,
                backgroundColor: isValid ? 'rgba(42, 157, 143, 0.45)' : 'rgba(201, 74, 56, 0.45)',
              }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-[#D49A2A]"
              style={{ left: `${(limit / 35) * 100}%` }}
              title="Garis Batas 20"
            />
            <div className="relative z-10 flex items-center justify-between w-full text-xs font-math">
              <span>0</span>
              <span className="text-[#F4C456] font-bold">Batas 20</span>
              <span>35</span>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium ${
              isValid
                ? 'bg-[#123332] border-[#2A9D8F]/60 text-[#9CF0E4]'
                : 'bg-[#36181A] border-[#C94A38]/60 text-[#FFC2BA]'
            }`}
          >
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#C94A38] shrink-0" aria-hidden="true" />
            )}
            <span>
              {isValid
                ? `MEMENUHI: ${crates} sesuai aturan (${ops.find((o) => o.value === activeOp)?.label}).`
                : `MELANGGAR: ${crates} tidak memenuhi aturan (${ops.find((o) => o.value === activeOp)?.label}).`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Mission 2: Ship Capacity Simulator (2x + 3y <= 60)
  const usedSpace = 2 * foodX + 3 * waterY;
  const maxSpace = 60;
  const fits = usedSpace <= maxSpace;
  const fillPct = Math.min(100, (usedSpace / maxSpace) * 100);

  return (
    <div className="bg-[#112236] border border-[#253F5C] rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#F4EBD9]">
            Simulator Palka Kapal (Kapasitas 60 Unit)
          </h3>
          <p className="text-xs text-[#9FB0C4]">
            Setiap peti makanan (x) butuh 2 unit ruang, setiap tong air (y) butuh 3 unit ruang.
          </p>
        </div>
        <Package className="w-5 h-5 text-[#D49A2A] shrink-0" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between text-xs">
            <label htmlFor="m2-food" className="text-[#D8E1EB] font-medium">
              Peti Makanan (x) · 2 unit/peti
            </label>
            <span className="font-math font-bold text-[#D49A2A] tabular-nums">{foodX} peti</span>
          </div>
          <input
            id="m2-food"
            type="range"
            min={0}
            max={35}
            value={foodX}
            onChange={(e) => setFoodX(Number(e.target.value))}
            className="w-full accent-[#D49A2A] cursor-pointer"
          />
          <div className="text-xs font-math text-[#8FA4BC]">Ruang makanan: 2({foodX}) = {2 * foodX} unit</div>
        </div>

        <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-3.5 space-y-2">
          <div className="flex justify-between text-xs">
            <label htmlFor="m2-water" className="text-[#D8E1EB] font-medium">
              Tong Air (y) · 3 unit/tong
            </label>
            <span className="font-math font-bold text-[#2A9D8F] tabular-nums">{waterY} tong</span>
          </div>
          <input
            id="m2-water"
            type="range"
            min={0}
            max={25}
            value={waterY}
            onChange={(e) => setWaterY(Number(e.target.value))}
            className="w-full accent-[#2A9D8F] cursor-pointer"
          />
          <div className="text-xs font-math text-[#8FA4BC]">Ruang air: 3({waterY}) = {3 * waterY} unit</div>
        </div>
      </div>

      <div className="bg-[#0B1726] border border-[#1E354E] rounded-lg p-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#D8E1EB]">Total Ruang Terpakai (<span className="font-math">2x + 3y</span>)</span>
          <span className={`font-math font-bold tabular-nums ${fits ? 'text-[#9CF0E4]' : 'text-[#FFC2BA]'}`}>
            {usedSpace} / {maxSpace} unit
          </span>
        </div>
        <div className="h-4 w-full bg-[#13263B] rounded-full overflow-hidden border border-[#253F5C]">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${fillPct}%`,
              backgroundColor: fits ? '#2A9D8F' : '#C94A38',
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          {fits ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" aria-hidden="true" />
              <span className="text-[#9CF0E4]">
                MUAT: {usedSpace} ≤ 60. Kapal aman berlayar!
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-[#C94A38] shrink-0" aria-hidden="true" />
              <span className="text-[#FFC2BA]">
                KELEBIHAN MUATAN: {usedSpace} &gt; 60. Palka penuh melebihi batas!
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
