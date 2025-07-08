"use client";

import { useQuests, useReferral } from "@/lib/query-helper";
import { useSubmitReferral, useClaimTask } from "@/lib/mutation-helper";
import { useAccount } from "wagmi";
import TaskCard from "@/components/cards/task-card";
import GlareButton from "@/components/ui/glare-button";
import AddFriend from "@/components/icons/add-friend";
import { useEffect, useRef, useState } from "react";

export default function Tasks() {
  const { address } = useAccount();
  const questsQuery = useQuests(address);
  const referralQuery = useReferral();
  const submitMutation = useSubmitReferral();
  const claimTaskMutation = useClaimTask();
  const [referralCode, setReferralCode] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [claimedTasks, setClaimedTasks] = useState<Set<string>>(new Set());
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  // Load claimed tasks from localStorage on mount
  useEffect(() => {
    if (address) {
      const storageKey = `gorillaz_claimed_tasks_${address}`;
      const timestampKey = `gorillaz_claimed_tasks_timestamp_${address}`;
      
      const stored = localStorage.getItem(storageKey);
      const lastTimestamp = localStorage.getItem(timestampKey);
      
      // Check if we've passed midnight UTC since last storage
      const now = new Date();
      const todayMidnightUTC = new Date(now);
      todayMidnightUTC.setUTCHours(0, 0, 0, 0);
      
      if (lastTimestamp) {
        const lastStoredTime = new Date(parseInt(lastTimestamp));
        // If last storage was before today's midnight UTC, clear claimed tasks
        if (lastStoredTime < todayMidnightUTC) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(timestampKey);
          setClaimedTasks(new Set());
          return;
        }
      }
      
      if (stored) {
        try {
          const claimedArray = JSON.parse(stored);
          setClaimedTasks(new Set(claimedArray));
        } catch (error) {
          console.error('Error loading claimed tasks from localStorage:', error);
        }
      }
    }
  }, [address]);

  // Save claimed tasks to localStorage whenever they change
  useEffect(() => {
    if (address && claimedTasks.size > 0) {
      const storageKey = `gorillaz_claimed_tasks_${address}`;
      const timestampKey = `gorillaz_claimed_tasks_timestamp_${address}`;
      const claimedArray = Array.from(claimedTasks);
      localStorage.setItem(storageKey, JSON.stringify(claimedArray));
      localStorage.setItem(timestampKey, Date.now().toString());
    }
  }, [claimedTasks, address]);
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");

  // Calculate time until next midnight UTC
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextMidnightUTC = new Date(now);
      nextMidnightUTC.setUTCHours(24, 0, 0, 0);

      const timeDiff = nextMidnightUTC.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));

      setTimeUntilReset(`${hours}h `);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleReferralSubmit = () => {
    submitMutation.mutate(referralCode, {
      onSuccess: () => {
        alert("Referral registered!");
        setReferralCode("");
      },
    });
  };

  const handleCopyReferralLink = async () => {
    if (referralQuery.data?.referralCode) {
      const referralLink = `${window.location.origin}?ref=${referralQuery.data.referralCode}`;
      try {
        await navigator.clipboard.writeText(referralLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    }
  };

  if (questsQuery.isLoading || referralQuery.isLoading) {
    return (
      <div className="space-y-6">
        {/* Tasks Loading */}
        <div className="p-4 bg-translucent-dark-12 border-2 backdrop-blur-[60px] flex flex-col gap-3 rounded-3xl border-translucent-light-4">
          <div className="animate-pulse">
            {/* Header skeleton */}
            <div className="flex justify-between mb-3">
              <div className="h-6 bg-translucent-light-16 rounded w-16"></div>
              <div className="h-4 bg-translucent-light-16 rounded w-32"></div>
            </div>
            {/* Task cards skeleton */}
            <div className="flex gap-3 overflow-x-auto">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-translucent-light-4 bg-translucent-light-8 rounded-2xl p-4 flex flex-col items-center gap-4 min-w-[200px]"
                >
                  {/* Coin skeleton */}
                  <div className="flex-shrink-0 bg-translucent-light-12 border-translucent-light-4 border-2 p-10 rounded-[12px]">
                    <div className="w-[180px] h-[180px] bg-translucent-light-16 rounded"></div>
                  </div>
                  {/* Text skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-translucent-light-16 rounded w-24"></div>
                    <div className="h-4 bg-translucent-light-16 rounded w-20"></div>
                  </div>
                  {/* Button skeleton */}
                  <div className="w-full h-12 bg-translucent-light-16 rounded-[8px]"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Referral section skeleton */}
          <div className="animate-pulse">
            <div className="space-y-3">
              {/* Horizontal referral card skeleton */}
              <div className="flex items-center gap-4 p-4 bg-translucent-light-8 border-2 border-translucent-light-4 rounded-2xl">
                {/* Icon skeleton */}
                <div className="flex-shrink-0 bg-translucent-light-12 border-translucent-light-4 border-2 p-2 rounded-[12px] w-16 h-16">
                  <div className="w-12 h-12 bg-translucent-light-16 rounded"></div>
                </div>
                {/* Text skeleton */}
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-translucent-light-16 rounded w-32"></div>
                  <div className="h-4 bg-translucent-light-16 rounded w-40"></div>
                </div>
                {/* Button skeleton */}
                <div className="w-40 h-12 bg-translucent-light-16 rounded-[12px]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tasks Section */}
      <div className="p-4 bg-translucent-dark-12 border-2 backdrop-blur-[60px] flex flex-col gap-3 rounded-3xl border-translucent-light-4">
        <div className="flex justify-between">
          <h2 className="text-h5 font-[600] text-light-primary">Tasks</h2>
          <p className="font-pally text-translucent-light-64">
            New task in {timeUntilReset}
          </p>
        </div>
        {questsQuery.data && (
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {questsQuery.data.map((q: any) => {
              // Check if task is locally claimed or already claimed from backend
              const isTaskClaimed = claimedTasks.has(q.questId) || q.claimed;

              return (
                <TaskCard
                  key={q.id}
                  task={{
                    ...q,
                    claimed: isTaskClaimed,
                  }}
                  onClaim={(taskId) => {
                    console.log(
                      "Attempting to claim task:",
                      taskId,
                      "Task data:",
                      q,
                    );
                    // Set this specific task as claiming
                    setClaimingTaskId(q.questId);

                    // Use the questId (base quest ID) not the progress instance ID
                    claimTaskMutation.mutate(q.questId, {
                      onSuccess: () => {
                        // Mark task as claimed locally
                        setClaimedTasks(
                          (prev) => new Set([...prev, q.questId]),
                        );
                        setClaimingTaskId(null);
                        console.log("Task claimed successfully:", q.questId);
                      },
                      onError: (error) => {
                        console.error("Claim failed:", error);
                        setClaimingTaskId(null);
                        // Refresh quest data to get latest status
                        questsQuery.refetch();
                      },
                    });
                  }}
                  isClaimPending={claimingTaskId === q.questId}
                />
              );
            })}
          </div>
        )}

        <div className="p-4 bg-translucent-dark-12 border-2 backdrop-blur-[60px] flex flex-col gap-3 rounded-3xl border-translucent-light-4">
          {referralQuery.data && (
            <div className="space-y-3">
              {/* Horizontal Referral Card */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-translucent-light-8 border-2 border-translucent-light-4 rounded-2xl">
                {/* Add Friend Icon in Square Container */}
                <div className="flex-shrink-0 bg-translucent-light-12 border-translucent-light-4 border-2 p-2 rounded-[12px] w-16 h-16 flex items-center justify-center">
                  <AddFriend size={48} />
                </div>

                {/* Middle Text */}
                <div className="flex-1 text-center sm:text-start">
                  <p className="text-light-primary text-body1 font-semibold">
                    Get 50 bananas for free
                  </p>
                  <p className="text-translucent-light-64 text-body2-medium font-pally">
                    Invite your friend and get 50 bananas
                  </p>
                </div>

                {/* Copy Button */}
                <GlareButton
                  onClick={handleCopyReferralLink}
                  background={isCopied ? "#22C55E" : "#EAB308"}
                  borderRadius="12px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  className="text-white py-3 px-4 sm:px-6 text-body-2-semibold font-pally font-semibold w-full sm:w-auto"
                  disabled={isCopied}
                >
                  {isCopied ? "Copied!" : "Copy Link"}
                </GlareButton>
              </div>
            </div>
          )}

          {/* <div className="flex gap-3">
            <input
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="flex-1 px-4 py-2 bg-translucent-light-8 border-2 border-translucent-light-4 rounded-xl text-light-primary placeholder-translucent-light-64 focus:outline-none focus:border-accent-primary"
            />
            <GlareButton
              onClick={handleReferralSubmit}
              background="#2563EB"
              borderRadius="12px"
              borderColor="transparent"
              glareColor="#ffffff"
              glareOpacity={0.3}
              className="text-white px-6 py-2 text-body-2-semibold font-pally font-semibold"
              disabled={submitMutation.isPending || !referralCode.trim()}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </GlareButton>
          </div> */}
        </div>
      </div>

      {/* Referral Section */}
    </div>
  );
}
