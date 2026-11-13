import React, { useCallback, useEffect, useState } from 'react';
import { Award, BarChart3, CheckCircle2, Crown, RefreshCw, Shield, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ACHIEVEMENTS, ROYALE_STAGES } from '../engine/progression';

interface LeaderboardRow {
  username: string;
  rating: number;
  wins: number;
  games: number;
  xp: number;
  updatedAt: number;
}

interface TournamentData {
  id: string;
  name: string;
  timeControl: string;
  format: string;
  status: 'open' | 'active';
  participants: { username: string; rating: number; score: number }[];
}

// ============================================================================
// LEADERBOARDS
// ============================================================================
export const LeaderboardsView: React.FC = () => {
  const { profile } = useApp();
  const [entries, setEntries] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = (await res.json()) as { leaderboard?: LeaderboardRow[] };
      setEntries(data.leaderboard ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncMeAndReload = useCallback(async () => {
    setSyncing(true);
    try {
      const wins = profile.matchHistory.filter((m) => m.result === 'win').length;
      await fetch('/api/leaderboard/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          rating: profile.rating,
          wins,
          games: profile.matchHistory.length,
          xp: profile.xp,
        }),
      });
      await loadLeaderboard();
    } finally {
      setSyncing(false);
    }
  }, [profile, loadLeaderboard]);

  useEffect(() => {
    syncMeAndReload();
  }, [syncMeAndReload]);

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Live Server Standings</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
            Chess.org Rating Leaderboard
          </h2>
          <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] mt-0.5">
            Rankings reflect real active players synced to the Chess.org server—no fabricated bots.
          </p>
        </div>

        <button
          type="button"
          onClick={syncMeAndReload}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync My Standing</span>
        </button>
      </section>

      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#756F63] dark:text-[#9B9386]">
            Loading standings...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#756F63] dark:text-[#9B9386]">
            No players synced yet. Complete a match or click Sync My Standing to post your rating.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAE2D4]/60 dark:bg-[#2B2822]/60 border-b border-[#E6DDCE] dark:border-[#2F2B24] text-[#756F63] dark:text-[#9B9386]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold w-14">Rank</th>
                  <th className="py-2.5 px-4 font-semibold">Player</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Rating</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Wins</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Games</th>
                  <th className="py-2.5 px-4 font-semibold text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DDCE]/70 dark:divide-[#2F2B24]">
                {entries.map((row, idx) => {
                  const isMe = row.username.toLowerCase() === profile.username.toLowerCase();
                  return (
                    <tr
                      key={row.username}
                      className={
                        isMe
                          ? 'bg-[#F3EBDD]/70 dark:bg-[#2B2822]/70 font-semibold'
                          : 'hover:bg-[#EAE2D4]/30 dark:hover:bg-[#2B2822]/30'
                      }
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[#756F63] dark:text-[#9B9386]">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-[#292720] dark:text-[#F3EBDD]">
                        {row.username}
                        {isMe && (
                          <span className="ml-2 text-[11px] font-normal text-[#756F63] dark:text-[#9B9386]">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-[#292720] dark:text-[#F3EBDD]">
                        {row.rating}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-[#756F63] dark:text-[#B8B0A2]">
                        {row.wins}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-[#756F63] dark:text-[#B8B0A2]">
                        {row.games}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-right text-[#756F63] dark:text-[#B8B0A2]">
                        {row.xp.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

// ============================================================================
// TOURNAMENTS
// ============================================================================
export const TournamentsView: React.FC = () => {
  const { profile, navigate } = useApp();
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments');
      const data = (await res.json()) as { tournaments?: TournamentData[] };
      setTournaments(data.tournaments ?? []);
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      const res = await fetch(`/api/tournaments/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username, rating: profile.rating }),
      });
      const data = (await res.json()) as { tournament?: TournamentData };
      if (data.tournament) {
        setTournaments((prev) =>
          prev.map((t) => (t.id === id ? data.tournament! : t)),
        );
      }
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
          <Trophy className="w-3.5 h-3.5" />
          <span>Organized Competition</span>
        </div>
        <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
          Chess.org Scheduled Tournaments
        </h2>
        <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] mt-1">
          Register your rating in open Swiss, Arena, and Classical Round-Robin brackets.
        </p>
      </section>

      {loading ? (
        <div className="p-8 text-center text-xs text-[#756F63] dark:text-[#9B9386]">
          Loading tournaments...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tournaments.map((t) => {
            const joined = t.participants.some(
              (p) => p.username.toLowerCase() === profile.username.toLowerCase(),
            );
            return (
              <div
                key={t.id}
                className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#756F63] dark:text-[#9B9386]">
                    <span className="font-mono tabular-nums">{t.timeControl}</span>
                    <span>{t.status === 'open' ? 'Open Entry' : 'Active'}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#292720] dark:text-[#F3EBDD]">
                    {t.name}
                  </h3>
                  <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">{t.format}</p>
                  <p className="text-xs font-mono tabular-nums text-[#292720] dark:text-[#F3EBDD]">
                    {t.participants.length} registered {t.participants.length === 1 ? 'player' : 'players'}
                  </p>
                  {t.participants.length > 0 && (
                    <div className="pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24] space-y-1">
                      {t.participants.slice(0, 4).map((p) => (
                        <div
                          key={p.username}
                          className="flex items-center justify-between text-xs text-[#756F63] dark:text-[#B8B0A2]"
                        >
                          <span>{p.username}</span>
                          <span className="font-mono tabular-nums">{p.rating}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {joined ? (
                    <>
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#2D5E40]/12 text-[#2D5E40] dark:text-[#7AC496] text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registered</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('online-multiplayer')}
                        className="px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                      >
                        Enter Match Lobby
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(t.id)}
                      disabled={joiningId === t.id}
                      className="px-3 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      {joiningId === t.id ? 'Joining...' : 'Join Tournament'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACHIEVEMENTS
// ============================================================================
export const AchievementsView: React.FC = () => {
  const { profile } = useApp();
  const [filter, setFilter] = useState<'all' | 'play' | 'tactics' | 'explore' | 'mastery'>('all');

  const unlockedMap = new Map(profile.unlockedAchievements.map((u) => [u.id, u.unlockedAt]));
  const totalGames = profile.matchHistory.length;
  const totalWins = profile.matchHistory.filter((m) => m.result === 'win').length;
  const bestRush = Math.max(profile.puzzleRushBestTimed, profile.puzzleRushBestUntimed);

  const progressFor = (id: string): number => {
    switch (id) {
      case 'first-game':
        return Math.min(1, totalGames);
      case 'five-wins':
        return Math.min(5, totalWins);
      case 'first-puzzle':
        return Math.min(1, profile.puzzlesSolved);
      case 'ten-puzzles':
        return Math.min(10, profile.puzzlesSolved);
      case 'rush-streak-5':
        return Math.min(5, bestRush);
      case 'opening-scholar':
        return Math.min(3, profile.exploredOpenings.length);
      case 'royale-champion':
        return Math.min(3, profile.royaleStageReached);
      default:
        return 0;
    }
  };

  const items = ACHIEVEMENTS.filter((a) => filter === 'all' || a.category === filter);

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
            <Award className="w-3.5 h-3.5" />
            <span>Milestones</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
            Achievements ({profile.unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'play', 'tactics', 'explore', 'mastery'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize border ${
                filter === cat
                  ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] text-[#756F63] dark:text-[#B8B0A2] hover:bg-[#EAE2D4]/50 dark:hover:bg-[#2B2822]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((ach) => {
          const unlockedAt = unlockedMap.get(ach.id);
          const current = progressFor(ach.id);
          const pct = Math.min(100, Math.round((current / ach.target) * 100));

          return (
            <div
              key={ach.id}
              className={`border rounded-lg p-4 space-y-2.5 ${
                unlockedAt
                  ? 'border-[#2D5E40]/50 bg-[#FFFFFF] dark:bg-[#23201B]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF]/70 dark:bg-[#23201B]/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-[#292720] dark:text-[#F3EBDD]">
                    {ach.title}
                  </h3>
                  <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] mt-0.5">
                    {ach.description}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] shrink-0">
                  +{ach.xpReward} XP
                </span>
              </div>

              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-[#EAE2D4] dark:bg-[#2B2822] overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      unlockedAt ? 'bg-[#2D5E40] dark:bg-[#7AC496]' : 'bg-[#756F63]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#756F63] dark:text-[#9B9386]">
                  <span>
                    {current} / {ach.target}
                  </span>
                  <span>
                    {unlockedAt
                      ? `Unlocked ${new Date(unlockedAt).toLocaleDateString()}`
                      : 'In progress'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// XP & LEVELS
// ============================================================================
export const XpLevelsView: React.FC = () => {
  const { profile, levelInfo } = useApp();

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
              <Crown className="w-3.5 h-3.5" />
              <span>Progression</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
              Level {levelInfo.level} · {profile.title}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Total Experience</p>
            <p className="font-mono tabular-nums text-xl font-bold text-[#292720] dark:text-[#F3EBDD]">
              {profile.xp.toLocaleString()} XP
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-[#EAE2D4] dark:bg-[#2B2822] overflow-hidden">
            <div
              className="h-full bg-[#292720] dark:bg-[#F3EBDD] transition-all duration-300"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#756F63] dark:text-[#9B9386]">
            <span>{levelInfo.currentLevelXp} XP into Level {levelInfo.level}</span>
            <span>{levelInfo.nextLevelXp - levelInfo.currentLevelXp} XP to Level {levelInfo.level + 1}</span>
          </div>
        </div>
      </section>

      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
        <h3 className="font-display text-base font-bold text-[#292720] dark:text-[#F3EBDD]">
          Royale Ladder Titles & Rewards
        </h3>
        <div className="divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
          {ROYALE_STAGES.map((stage) => {
            const cleared = profile.royaleStageReached > stage.stage;
            return (
              <div
                key={stage.stage}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-[#292720] dark:text-[#F3EBDD]">
                    {stage.title}
                  </p>
                  <p className="text-[#756F63] dark:text-[#B8B0A2]">
                    Opponent: {stage.botName} · Reward: +{stage.xpReward} XP
                    {stage.unlockTitle ? ` · Title "${stage.unlockTitle}"` : ''}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    cleared
                      ? 'text-[#2D5E40] dark:text-[#7AC496]'
                      : 'text-[#9B9386]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{cleared ? 'Cleared' : 'Locked'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
