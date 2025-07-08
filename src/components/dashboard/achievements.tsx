"use client";

import { useState, useEffect } from "react";
import { useAchievements } from "@/lib/query-helper";
import { useClaimAchievement } from "@/lib/mutation-helper";
import AchievementCard from "@/components/cards/achievement-card";
import AchievementsModal from "@/components/modals/achievements-modal";
import AchievementClaimModal from "@/components/modals/achievement-claim-modal";

export default function Achievements() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimedAchievement, setClaimedAchievement] = useState<{
    id: string;
    title: string;
    description: string;
    xpReward: number;
  } | null>(null);
  
  const achievementsQuery = useAchievements();
  const claimMutation = useClaimAchievement({
    onSuccess: (data, achievementId) => {
      // Find the achievement that was claimed
      const achievement = achievementsQuery.data?.find(a => a.id === achievementId);
      if (achievement) {
        setClaimedAchievement({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          xpReward: achievement.xpReward,
        });
        setClaimModalOpen(true);
      }
    },
  });

  // Auto-claim completed achievements
  useEffect(() => {
    if (achievementsQuery.data) {
      const completedUnclaimed = achievementsQuery.data.find(
        (achievement: any) => 
          achievement.progress >= achievement.goal && 
          !achievement.claimed
      );
      
      if (completedUnclaimed && !claimMutation.isPending) {
        claimMutation.mutate(completedUnclaimed.id);
      }
    }
  }, [achievementsQuery.data, claimMutation]);

  if (achievementsQuery.isLoading) {
    return (
      <div className="p-4 bg-translucent-dark-12 border-2 backdrop-blur-[60px] flex flex-col gap-3 rounded-3xl border-translucent-light-4">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="h-6 bg-translucent-light-16 rounded w-24 mb-3"></div>
          
          {/* Achievement cards skeleton */}
          <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto overflow-y-hidden md:overflow-y-auto">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="border-2 border-translucent-light-4 bg-translucent-light-8 rounded-[24px] p-4 flex items-center justify-center aspect-square w-[180px] h-[180px] md:w-auto md:h-auto min-w-[180px]"
              >
                {/* Achievement coin skeleton */}
                <div className="w-[158px] h-[158px] bg-translucent-light-16 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-translucent-dark-12 border-2 backdrop-blur-[60px] flex flex-col gap-3 rounded-3xl border-translucent-light-4">
      <h2 className="text-h5 font-[600] text-light-primary">Achievements</h2>
      <div className="flex md:grid md:grid-cols-2 gap-3 overflow-x-auto overflow-y-hidden md:overflow-y-auto md:max-h-[700px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {achievementsQuery.data?.map(
          (achievement: {
            id: string;
            title: string;
            description: string;
            progress: number;
            goal: number;
            claimed: boolean;
            xpReward: number;
          }) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onClaim={(id) => claimMutation.mutate(id)}
              isClaimPending={claimMutation.isPending}
              onClick={() => setIsModalOpen(true)}
            />
          ),
        )}
      </div>

      <AchievementsModal
        isModalOpen={isModalOpen}
        setIsModalOpen={() => setIsModalOpen(false)}
        achievements={achievementsQuery.data || []}
        onClaim={(id) => claimMutation.mutate(id)}
        isClaimPending={claimMutation.isPending}
      />
      
      <AchievementClaimModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        achievement={claimedAchievement}
      />
    </div>
  );
}
