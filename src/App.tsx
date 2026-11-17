import { useCallback, useEffect, useState } from 'react';
import { CHAPTERS, MISSIONS } from './data/campaign';
import { GameHud } from './components/GameHud';
import { MissionWorkspace } from './components/MissionWorkspace';
import { PauseModal, VictoryModal } from './components/StatusModals';
import { TitleScreen } from './components/TitleScreen';
import { VoyageMapModal } from './components/VoyageMapModal';
import { soundFX } from './utils/sound';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

interface SavedProgress {
  currentMissionId: number;
  completedMissions: number[];
  coins: number;
  attempts: number;
  correctAttempts: number;
  exploreAllUnlocked: boolean;
}

const STORAGE_KEY = 'the_last_pirate_progress_v1';

const DEFAULT_PROGRESS: SavedProgress = {
  currentMissionId: 1,
  completedMissions: [],
  coins: 0,
  attempts: 0,
  correctAttempts: 0,
  exploreAllUnlocked: false,
};

function loadProgress(): SavedProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      currentMissionId:
        typeof parsed.currentMissionId === 'number' &&
        parsed.currentMissionId >= 1 &&
        parsed.currentMissionId <= 12
          ? parsed.currentMissionId
          : 1,
      completedMissions: Array.isArray(parsed.completedMissions)
        ? parsed.completedMissions
        : [],
      coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      correctAttempts:
        typeof parsed.correctAttempts === 'number' ? parsed.correctAttempts : 0,
      exploreAllUnlocked: Boolean(parsed.exploreAllUnlocked),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [progress, setProgress] = useState<SavedProgress>(loadProgress);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [missionResetKey, setMissionResetKey] = useState(0);

  // Sync body dataset state for testing & state hygiene
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Persist progress
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota issues
    }
  }, [progress]);

  const currentMission =
    MISSIONS.find((m) => m.id === progress.currentMissionId) || MISSIONS[0];
  const currentChapter =
    CHAPTERS.find((c) => c.id === currentMission.chapterId) || CHAPTERS[0];

  const highestUnlockedId = Math.min(
    12,
    Math.max(1, ...progress.completedMissions.map((id) => id + 1))
  );

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFX.muted = next;
      return next;
    });
  }, []);

  const handleStartNew = useCallback(() => {
    soundFX.playClick();
    setProgress(DEFAULT_PROGRESS);
    setMissionResetKey((k) => k + 1);
    setMapOpen(false);
    setGameState('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleContinue = useCallback(() => {
    soundFX.playClick();
    setMapOpen(false);
    setGameState('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleSelectMission = useCallback((missionId: number) => {
    soundFX.playClick();
    setProgress((prev) => ({
      ...prev,
      currentMissionId: missionId,
    }));
    setMissionResetKey((k) => k + 1);
    setGameState('playing');
  }, []);

  const handleRecordAttempt = useCallback((correct: boolean) => {
    setProgress((prev) => ({
      ...prev,
      attempts: prev.attempts + 1,
      correctAttempts: prev.correctAttempts + (correct ? 1 : 0),
    }));
  }, []);

  const handleCompleteMission = useCallback(
    (missionId: number, rewardCoins: number) => {
      setProgress((prev) => {
        const nextCompleted = prev.completedMissions.includes(missionId)
          ? prev.completedMissions
          : [...prev.completedMissions, missionId];
        const nextMissionId = missionId < 12 ? missionId + 1 : 12;
        return {
          ...prev,
          completedMissions: nextCompleted,
          coins: prev.coins + rewardCoins,
          currentMissionId: nextMissionId,
        };
      });
      setMissionResetKey((k) => k + 1);
      if (missionId === 12) {
        setGameState('gameover');
      }
    },
    []
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isTyping) return;

      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (progress.completedMissions.length > 0 || progress.currentMissionId > 1) {
            handleContinue();
          } else {
            handleStartNew();
          }
          return;
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setMapOpen((v) => !v);
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (mapOpen) {
          e.preventDefault();
          setMapOpen(false);
          return;
        }
        if (gameState === 'playing') {
          e.preventDefault();
          setGameState('paused');
        } else if (gameState === 'paused') {
          e.preventDefault();
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    mapOpen,
    progress.completedMissions.length,
    progress.currentMissionId,
    handleContinue,
    handleStartNew,
    handleToggleMute,
  ]);

  const accuracyPct =
    progress.attempts > 0
      ? Math.round((progress.correctAttempts / progress.attempts) * 100)
      : 100;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1726] text-[#F4EBD9]">
      {gameState === 'title' ? (
        <TitleScreen
          hasProgress={
            progress.completedMissions.length > 0 || progress.currentMissionId > 1
          }
          completedCount={progress.completedMissions.length}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
          onOpenMap={() => setMapOpen(true)}
        />
      ) : (
        <>
          <GameHud
            chapter={currentChapter}
            mission={currentMission}
            completedCount={progress.completedMissions.length}
            coins={progress.coins}
            muted={muted}
            onToggleMute={handleToggleMute}
            onOpenMap={() => setMapOpen(true)}
            onPause={() => setGameState('paused')}
          />

          <main className="flex-1 w-full pb-10">
            <MissionWorkspace
              key={`${currentMission.id}-${missionResetKey}`}
              mission={currentMission}
              alreadyCompleted={progress.completedMissions.includes(
                currentMission.id
              )}
              onRecordAttempt={handleRecordAttempt}
              onCompleteMission={handleCompleteMission}
            />
          </main>
        </>
      )}

      <VoyageMapModal
        isOpen={mapOpen}
        currentMissionId={progress.currentMissionId}
        completedMissions={progress.completedMissions}
        highestUnlockedId={highestUnlockedId}
        exploreAllUnlocked={progress.exploreAllUnlocked}
        onToggleExploreAll={() =>
          setProgress((prev) => ({
            ...prev,
            exploreAllUnlocked: !prev.exploreAllUnlocked,
          }))
        }
        onSelectMission={handleSelectMission}
        onClose={() => setMapOpen(false)}
      />

      <PauseModal
        isOpen={gameState === 'paused'}
        onResume={() => setGameState('playing')}
        onRestartMission={() => {
          setMissionResetKey((k) => k + 1);
          setGameState('playing');
        }}
        onReturnTitle={() => setGameState('title')}
      />

      <VictoryModal
        isOpen={gameState === 'gameover'}
        completedCount={progress.completedMissions.length}
        coins={progress.coins}
        accuracyPct={accuracyPct}
        onPlayAgain={handleStartNew}
        onReturnTitle={() => setGameState('title')}
      />
    </div>
  );
}
