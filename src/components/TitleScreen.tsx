import { Compass, Map as MapIcon, Play } from 'lucide-react';

interface TitleScreenProps {
  hasProgress: boolean;
  completedCount: number;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenMap: () => void;
}

export function TitleScreen({
  hasProgress,
  completedCount,
  onStartNew,
  onContinue,
  onOpenMap,
}: TitleScreenProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0B1726] flex flex-col justify-between">
      {/* Illustrated Key-Art Backdrop */}
      <img
        src="/src/assets/images/title_pirate_ship_1794838764583.jpg"
        alt="Kapal bajak laut berlayar menuju benteng Raja Aurelius"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      {/* Left-third negative-space contrast scrim for legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#07101B]/95 via-[#07101B]/70 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07101B]/90 to-transparent"
        aria-hidden="true"
      />

      {/* Main Hero Content Anchored on Left Negative Space */}
      <main className="relative z-10 flex-1 flex items-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-xl w-full space-y-8">
          {/* Custom Inline SVG Compass Crest & Title Lockup */}
          <div className="space-y-4">
            <svg
              viewBox="0 0 420 116"
              className="w-full max-w-[420px] h-auto overflow-visible"
              role="img"
              aria-label="The Last Pirate"
            >
              {/* Nautical Compass Emblem */}
              <g transform="translate(36, 56)">
                <circle cx="0" cy="0" r="30" fill="#0D1E32" stroke="#D49A2A" strokeWidth="2.5" />
                <circle cx="0" cy="0" r="23" fill="none" stroke="#D49A2A" strokeOpacity="0.45" strokeWidth="1" />
                <polygon points="0,-24 5,-5 24,0 5,5 0,24 -5,5 -24,0 -5,-5" fill="#D49A2A" />
                <polygon points="0,-16 3,-3 16,0 3,3 0,16 -3,3 -16,0 -3,-3" fill="#FFF4D6" />
                <circle cx="0" cy="0" r="3.5" fill="#0D1E32" stroke="#D49A2A" strokeWidth="1.5" />
              </g>
              {/* Title Typography */}
              <text
                x="82"
                y="46"
                fill="#D49A2A"
                fontSize="13"
                fontWeight="600"
                letterSpacing="4"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                PETUALANGAN PROGRAM LINEAR
              </text>
              <text
                x="80"
                y="88"
                fill="#F9F1E2"
                fontSize="40"
                fontWeight="700"
                letterSpacing="2"
                fontFamily="Cinzel, Georgia, serif"
              >
                THE LAST PIRATE
              </text>
              <line x1="82" y1="102" x2="390" y2="102" stroke="#D49A2A" strokeOpacity="0.55" strokeWidth="1.5" />
            </svg>

            <p className="text-base md:text-lg text-[#D8E1EB] leading-relaxed max-w-md">
              Kumpulkan kekuatan bersama kru, kuasai pertidaksamaan hingga optimasi titik pojok, dan tumbangkan blokade Raja Aurelius dalam 5 Chapter dan 12 Misi.
            </p>
          </div>

          {/* Primary Actions (<= 3 actions total) */}
          <div className="flex flex-wrap items-center gap-3.5">
            {hasProgress ? (
              <>
                <button
                  type="button"
                  data-start="true"
                  onClick={onContinue}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-base shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF4D6]"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  Lanjutkan Pelayaran ({completedCount}/12 Misi)
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#13263B]/90 hover:bg-[#1A334F] text-[#F4EBD9] border border-[#D49A2A]/40 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D49A2A]"
                >
                  <Compass className="w-4 h-4 text-[#D49A2A]" aria-hidden="true" />
                  Mulai dari Awal
                </button>
              </>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onStartNew}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#D49A2A] hover:bg-[#E0AA3E] text-[#0B1726] font-semibold text-base shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF4D6]"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                Mulai Petualangan
              </button>
            )}

            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#13263B]/90 hover:bg-[#1A334F] text-[#F4EBD9] border border-[#344C66] font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D49A2A]"
            >
              <MapIcon className="w-4 h-4 text-[#2A9D8F]" aria-hidden="true" />
              Peta Grand Line 3D
            </button>
          </div>
        </div>
      </main>

      {/* Single flat bottom control hint */}
      <footer className="relative z-10 px-8 md:px-16 lg:px-24 pb-6">
        <p className="text-xs text-[#9FB0C4] tracking-wide">
          Enter atau Spasi Mulai · C Peta Pelayaran · M Suara
        </p>
      </footer>
    </div>
  );
}
