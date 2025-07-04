// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useSignMessage, useWaitForTransactionReceipt, useWriteContract, useDisconnect } from 'wagmi';
import {  useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ethers } from 'ethers';

const API = 'http://localhost:3001/api';
const COINFLIP_ABI = [
  {
    name: 'flipCoin',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
];

const COINFLIP_ADDRESS = '0x990c54Df5208D09cB667d2c057a1906cB45aDa07';
const COINFLIP_FEE = "0.0001"

export default function Home() {
  const { address, isConnected } = useAccount();
  console.log(isConnected)
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();


  const { connect, connectors, error: connectError, isLoading, pendingConnector } = useConnect();
  const { data: hash,error, writeContract } = useWriteContract()
  console.log(error)
    const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1, // optional, defaults to 1
  });



  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const queryClient = useQueryClient();
  const [referralCode, setReferralCode] = useState('');

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('gorillaz_token');
    if (stored) setToken(stored);
  }, []);

      // Reactively refresh data once confirmed
  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['myFlips'] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['flipCount'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });

    }
  }, [isConfirmed, queryClient]);

  const login = async () => {
    const message = `Sign this message to login: ${address}`;
    const signature = await signMessageAsync({ message });
    const { data } = await axios.post(`${API}/auth/login`, { address, signature });
    localStorage.setItem('gorillaz_token', data.token);
    setToken(data.token);
    queryClient.invalidateQueries();
  };

const logout = () => {
  localStorage.removeItem('gorillaz_token');
  setToken(null);
  queryClient.clear();
  disconnect(); // 👈 Disconnect from wallet
};

const claimAchievement = async (id: string) => {
  const res = await axios.post(`${API}/achievements/claim/${id}`, {}, { headers: authHeaders });
  return res.data;
};

const claimMutation = useMutation({
  mutationFn: claimAchievement,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['achievements'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  },
});
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await axios.get(`${API}/stats/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const flipsQuery = useQuery({
    queryKey: ['myFlips'],
    queryFn: async () => (await axios.get(`${API}/stats/flip-history/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => (await axios.get(`${API}/leaderboard`)).data,
    enabled: isClient,
  });

  const questsQuery = useQuery({
    queryKey: ['quests'],
    queryFn: async () => (await axios.get(`${API}/quests/${address}`, { headers: authHeaders })).data,
    enabled: !!token && !!address && isClient,
  });

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => (await axios.get(`${API}/achievements/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const referralQuery = useQuery({
    queryKey: ['referral'],
    queryFn: async () => (await axios.get(`${API}/referrals/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const flipLimitQuery = useQuery({
  queryKey: ['flipCount'],
  queryFn: async () => (await axios.get(`${API}/stats/flip-count/me`, { headers: authHeaders })).data,
  enabled: !!token && isClient,
});

const globalStatsQuery = useQuery({
  queryKey: ['globalStats'],
  queryFn: async () =>
    (await axios.get(`${API}/stats/global`, { headers: authHeaders })).data,
  enabled: !!token && isClient,
});

  const startCoinFlip = async () => {
    writeContract({
      address: COINFLIP_ADDRESS,
      abi: COINFLIP_ABI,
      functionName: 'flipCoin',
      value: ethers.parseEther(COINFLIP_FEE)
    })
  }

  const submitReferral = async () => {
    await axios.post(`${API}/referrals`, { referralCode }, { headers: authHeaders });
    alert('Referral registered!');
    setReferralCode('');
    queryClient.invalidateQueries({ queryKey: ['referral'] });
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🍌 Gorillaz XP Tester</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🍌 Gorillaz XP Tester</h1>

      {!isConnected && (
        <div className="mb-4">
          <h2 className="font-semibold">Connect Wallet</h2>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="bg-blue-600 text-white px-4 py-2 mr-2 rounded mb-2"
            >
              {connector.name}
              {isLoading && connector.id === pendingConnector?.id && '…'}
            </button>
          ))}
          {connectError && <p className="text-red-500">{connectError.message}</p>}
        </div>
      )}

      {!token && isConnected && (
        <button onClick={login} className="bg-black text-white px-4 py-2">
          Sign & Login
        </button>
      )}

      {token && (
        <button className="text-red-600 underline" onClick={logout}>
          Logout
        </button>
      )}

      {token && statsQuery.data && (
        <div className=" p-4 mt-4 rounded shadow">
          <h2 className="font-semibold">🧍 Your Stats</h2>
          <p>XP (🍌 Bananas): {statsQuery.data.xp}</p>
          <p>Total Flips: {statsQuery.data.totalFlips}</p>
          <p>Heads: {statsQuery.data.totalHeads} | Tails: {statsQuery.data.totalTails}</p>

          <button
            onClick={startCoinFlip}
            className="mt-3 bg-green-600 text-white px-3 py-1 rounded"
          >
            🎲 Flip Coin (${COINFLIP_FEE} ETH)
          </button>
        </div>
      )}

      {token && globalStatsQuery.data && (
  <div className="mt-4 p-4 rounded shadow">
    <h2 className="font-semibold">🌍 Global Stats</h2>
    <p>Your XP Rank: #{globalStatsQuery.data.rank}</p>
    <p>Total Users: {globalStatsQuery.data.totalUsers}</p>
    <p>Total XP Given: 🍌 {globalStatsQuery.data.totalXpGiven}</p>
  </div>
)}

      {token && flipLimitQuery.data && (
  <p className="text-sm text-gray-500">Daily flips remaining: {flipLimitQuery.data.remaining}/10</p>
)}

      {token && flipsQuery.data && (
        <div className="mt-4">
          <h2 className="font-semibold">🪙 Flip History</h2>
          <ul className="text-sm">
            {flipsQuery.data.map((flip: any) => (
              <li key={flip.id}>
                {flip.result} — {new Date(flip.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {leaderboardQuery.data && (
        <div className="mt-4">
          <h2 className="font-semibold">🏆 Leaderboard</h2>
          <ul className="text-sm">
            {leaderboardQuery.data.map((user: any, i: number) => (
              <li key={user.walletAddress}>
                #{i + 1} — {user.walletAddress} — 🍌 {user.xp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {questsQuery.data && (
        <div className="mt-4">
          <h2 className="font-semibold">🧩 Quests</h2>
          <ul className="text-sm">
            {questsQuery.data.map((q: any) => (
              <li key={q.id}>{q.quest.condition} — {q.completed ? '✅ Done' : `⏳ In Progress ${q.progressCount}`}</li>
            ))}
          </ul>
        </div>
      )}

   {achievementsQuery.data && (
  <div className="mt-4">
    <h2 className="font-semibold">🏅 Achievements</h2>
    <ul className="text-sm space-y-2">
      {achievementsQuery.data.map((a: any) => (
        <li key={a.id} className="border rounded p-2 flex justify-between items-center">
          <div>
            <p className="font-medium">{a.title}</p>
            <p className="text-gray-500 text-xs">{a.description}</p>
            <p className="text-xs">Progress: {a.progress}/{a.goal}</p>
          </div>

          {a.claimed ? (
            <span className="text-green-500 text-sm">✅ Claimed</span>
          ) : a.progress >= a.goal ? (
            <button
              onClick={() => claimMutation.mutate(a.id)}
              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
            >
              🎁 Claim {a.xpReward} XP
            </button>
          ) : (
            <span className="text-gray-400 text-sm">⏳ In Progress</span>
          )}
        </li>
      ))}
    </ul>
  </div>
)}

      {referralQuery.data && (
        <div className="mt-4">
          <h2 className="font-semibold">👥 Referral</h2>
          <p>Your Code: {referralQuery.data.referralCode}</p>
          <p>Invited: {referralQuery.data.referredUsers.length}</p>
        </div>
      )}

      {token && (
        <div className="mt-4">
          <input
            placeholder="Enter referral code"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
            className="border p-1"
          />
          <button
            onClick={submitReferral}
            className="ml-2 bg-blue-600 text-white px-3 py-1 rounded"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}