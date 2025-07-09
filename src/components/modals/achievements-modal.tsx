"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import AchievementsSection from "../sections/achievement-section";

interface AchievementsModalProps {
  isModalOpen: boolean;
  setIsModalOpen: () => void;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    progress: number;
    goal: number;
    claimed: boolean;
    xpReward: number;
  }>;
  onClaim: (id: string) => void;
  isClaimPending: boolean;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  achievements,
  onClaim,
  isClaimPending,
}) => {
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent
        className="sm:max-w-4xl bg-translucent-dark-12 border-translucent-light-4 backdrop-blur-3xl rounded-3xl max-h-[80vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-h5 text-light-primary text-start leading-loose tracking-tight text-2xl font-semibold">
            Achievements
          </DialogTitle>
        </DialogHeader>

        <AchievementsSection
          achievements={achievements}
          onClaim={onClaim}
          isClaimPending={isClaimPending}
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AchievementsModal;
