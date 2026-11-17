import { Crown, Home, Play, RotateCcw } from 'lucide-react';
import { CharacterPortrait } from './CharacterPortrait';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestartMission: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({
  isOpen,
  onResume,
  onRestartMission,
  onReturnTitle,
}: PauseModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050C14]/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div className="bg-[#0F1F33] border border-[#D49A2A]/50 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="space-y-1 text-center">
          <h2 id="pause-modal-title" className="font-display text-2xl font-bold text-[#F4EBD9]">
            Pelayaran Dijeda
          </h2>
          <p className="text-sm text-[#9FB0C4]">
            Kompas ditahan sejenak. Tekan Escape atau P untuk melanjutkan.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-sm transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            Lanjutkan Misi
          </button>
          <button
            type="button"
            onClick={onRestartMission}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#2C4766] text-[#F4EBD9] font-medium text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />
            Ulangi Misi Ini
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0B1726] hover:bg-[#13263B] border border-[#223954] text-[#B8C6D6] font-medium text-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Kembali ke Layar Judul
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  isOpen: boolean;
  completedCount: number;
  coins: number;
  accuracyPct: number;
  onPlayAgain: () => void;
  onReturnTitle: () => void;
}

export function VictoryModal({
  isOpen,
  completedCount,
  coins,
  accuracyPct,
  onPlayAgain,
  onReturnTitle,
}: VictoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050C14]/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-modal-title"
    >
      <div className="bg-[#0F1F33] border border-[#D49A2A] rounded-xl max-w-lg w-full p-7 space-y-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#D49A2A]/20 border border-[#D49A2A] flex items-center justify-center">
            <Crown className="w-7 h-7 text-[#F4C456]" aria-hidden="true" />
          </div>
          <h2 id="victory-modal-title" className="font-display text-2xl md:text-3xl font-bold text-[#F4EBD9]">
            Raja Aurelius Tumbang!
          </h2>
          <p className="text-sm text-[#C8D4E3] leading-relaxed">
            Selamat, Kapten! Kamu telah menguasai seluruh rangkaian Program Linear dari tanda pertidaksamaan hingga optimasi strategi armada dan membebaskan lautan.
          </p>
        </div>

        <div className="flex justify-center">
          <CharacterPortrait characterId="captain" size="md" showRole />
        </div>

        {/* Mastery Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0B1726] border border-[#223954] rounded-lg p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-[#8FA4BC]">Misi Selesai</div>
            <div className="font-math text-xl font-bold text-[#9CF0E4] tabular-nums mt-1">
              {completedCount}/12
            </div>
          </div>
          <div className="bg-[#0B1726] border border-[#223954] rounded-lg p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-[#8FA4BC]">Harta Koin</div>
            <div className="font-math text-xl font-bold text-[#F4C456] tabular-nums mt-1">
              {coins}
            </div>
          </div>
          <div className="bg-[#0B1726] border border-[#223954] rounded-lg p-3 text-center">
            <div className="text-[11px] uppercase tracking-wider text-[#8FA4BC]">Akurasi</div>
            <div className="font-math text-xl font-bold text-[#F4EBD9] tabular-nums mt-1">
              {accuracyPct}%
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Main Lagi dari Awal
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#152B44] hover:bg-[#1D3856] border border-[#2C4766] text-[#F4EBD9] font-medium text-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Layar Judul
          </button>
        </div>
      </div>
    </div>
  );
}
