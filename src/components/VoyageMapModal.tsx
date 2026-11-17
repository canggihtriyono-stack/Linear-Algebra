import { GrandLineMap3D } from './GrandLineMap3D';

interface VoyageMapModalProps {
  isOpen: boolean;
  currentMissionId: number;
  completedMissions: number[];
  highestUnlockedId: number;
  exploreAllUnlocked: boolean;
  onToggleExploreAll: () => void;
  onSelectMission: (missionId: number) => void;
  onClose: () => void;
}

export function VoyageMapModal(props: VoyageMapModalProps) {
  if (!props.isOpen) return null;

  return (
    <GrandLineMap3D
      currentMissionId={props.currentMissionId}
      completedMissions={props.completedMissions}
      highestUnlockedId={props.highestUnlockedId}
      exploreAllUnlocked={props.exploreAllUnlocked}
      onToggleExploreAll={props.onToggleExploreAll}
      onSelectMission={props.onSelectMission}
      onClose={props.onClose}
    />
  );
}
