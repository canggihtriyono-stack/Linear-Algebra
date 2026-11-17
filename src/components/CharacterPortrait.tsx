import { useState } from 'react';
import { CHARACTERS, type CharacterId } from '../data/campaign';

interface CharacterPortraitProps {
  characterId: CharacterId;
  size?: 'sm' | 'md' | 'lg';
  showRole?: boolean;
}

export function CharacterPortrait({
  characterId,
  size = 'md',
  showRole = true,
}: CharacterPortraitProps) {
  const [imgError, setImgError] = useState(false);
  const char = CHARACTERS[characterId];

  const sizeClass =
    size === 'sm'
      ? 'w-12 h-12'
      : size === 'lg'
      ? 'w-24 h-24 md:w-28 md:h-28'
      : 'w-16 h-16';

  return (
    <div className="flex items-center gap-3.5 shrink-0">
      <div
        className={`${sizeClass} relative rounded-lg overflow-hidden border border-[#D49A2A]/40 bg-[#102338] shrink-0 shadow-md`}
      >
        {char.image && !imgError ? (
          <img
            src={char.image}
            alt={`${char.name} — ${char.role}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#162C46] to-[#0B1726]">
            {characterId === 'marcus' ? (
              <svg viewBox="0 0 48 48" className="w-8 h-8" aria-hidden="true">
                <circle cx="24" cy="24" r="18" fill="none" stroke="#D49A2A" strokeWidth="2" />
                <path
                  d="M17 20c0-4 3-7 7-7s7 3 7 7M14 33c1.5-5 5-7 10-7s8.5 2 10 7"
                  fill="none"
                  stroke="#F4EBD9"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="20" r="3" fill="#D49A2A" />
              </svg>
            ) : (
              <svg viewBox="0 0 48 48" className="w-8 h-8" aria-hidden="true">
                <circle cx="24" cy="24" r="17" fill="none" stroke="#D49A2A" strokeWidth="1.8" />
                <polygon points="24,8 27,21 40,24 27,27 24,40 21,27 8,24 21,21" fill="#D49A2A" />
                <circle cx="24" cy="24" r="3" fill="#0B1726" />
              </svg>
            )}
          </div>
        )}
      </div>

      {showRole && (
        <div className="min-w-0">
          <div
            className="font-display text-sm md:text-base font-bold tracking-wide truncate"
            style={{ color: char.accentColor }}
          >
            {char.name}
          </div>
          <div className="text-xs text-[#A9B8CA] truncate">{char.role}</div>
        </div>
      )}
    </div>
  );
}
