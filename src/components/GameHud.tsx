import { Coins, Compass, Map as MapIcon, Pause, Volume2, VolumeX } from 'lucide-react';
import type { ChapterMeta, MissionConfig } from '../data/campaign';

interface GameHudProps {
  chapter: ChapterMeta;
  mission: MissionConfig;
  completedCount: number;
  coins: number;
  muted: boolean;
  onToggleMute: () => void;
  onOpenMap: () => void;
  onPause: () => void;
}

export function GameHud({
  chapter,
  mission,
  completedCount,
  coins,
  muted,
  onToggleMute,
  onOpenMap,
  onPause,
}: GameHudProps) {
  return (
    <header className="w-full border-b border-[#223954] bg-[#0D1C2E]/95 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Active Chapter & Mission */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#152B44] border border-[#D49A2A]/40 flex items-center justify-center shrink-0">
          <Compass className="w-5 h-5 text-[#D49A2A]" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-[#D49A2A] font-semibold truncate">
            {chapter.title}
          </div>
          <h1 className="font-display text-sm md:text-base font-bold text-[#F4EBD9] truncate">
            {mission.title}
          </h1>
        </div>
      </div>

      {/* Right: Metrics + Compact Utility Buttons */}
      <div className="flex items-center gap-4 md:gap-6 shrink-0">
        <div className="hidden sm:flex items-center gap-5 text-xs text-[#B8C6D6]">
          <div className="flex items-center gap-2">
            <span className="text-[#8FA4BC]">Progres</span>
            <span className="font-math font-bold text-sm text-[#F4EBD9] tabular-nums">
              {completedCount}/12 Misi
            </span>
          </div>
          <span className="text-[#344C66]" aria-hidden="true">|</span>
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-[#D49A2A]" aria-hidden="true" />
            <span className="font-math font-bold text-sm text-[#F4C456] tabular-nums">
              {coins} Koin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMap();
            }}
            aria-label="Buka Peta Pelayaran [C]"
            title="Peta Grand Line 3D [C]"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#2C4766] text-xs font-medium text-[#E4ECF5] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <MapIcon className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />
            <span className="hidden md:inline">Peta 3D [C]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Aktifkan Suara [M]' : 'Matikan Suara [M]'}
            title={muted ? 'Aktifkan Suara [M]' : 'Matikan Suara [M]'}
            className="w-9 h-9 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#2C4766] flex items-center justify-center text-[#E4ECF5] transition-colors cursor-pointer shrink-0"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-[#C94A38]" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#D49A2A]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Jeda Permainan [P]"
            title="Jeda Permainan [P]"
            className="w-9 h-9 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#2C4766] flex items-center justify-center text-[#E4ECF5] transition-colors cursor-pointer shrink-0"
          >
            <Pause className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
