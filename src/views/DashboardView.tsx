import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Cpu,
  Crown,
  Puzzle,
  SearchCheck,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDailyPuzzle, getDateKey } from '../data/puzzles';
import { OPENINGS } from '../data/openings';
import { ACHIEVEMENTS } from '../engine/progression';
import { Chessboard2D } from '../components/chess/Chessboard2D';

export const DashboardView: React.FC = () => {
  const { profile, levelInfo, navigate, openGameReview } = useApp();

  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const todayKey = getDateKey();
  const isDailySolved = profile.dailyPuzzleSolvedDates.includes(todayKey);

  const stats = useMemo(() => {
    const games = profile.matchHistory;
    const wins = games.filter((g) => g.result === 'win').length;
    const losses = games.filter((g) => g.result === 'loss').length;
    const draws = games.filter((g) => g.result === 'draw').length;
    const winRate = games.length > 0 ? Math.round((wins / games.length) * 100) : 0;

    const tcCounts = new Map<string, number>();
    for (const g of games) {
      tcCounts.set(g.timeControlLabel, (tcCounts.get(g.timeControlLabel) ?? 0) + 1);
    }
    const favoriteTimeControls = Array.from(tcCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total: games.length, wins, losses, draws, winRate, favoriteTimeControls };
  }, [profile.matchHistory]);

  const recentAchievements = useMemo(() => {
    return profile.unlockedAchievements
      .slice(-3)
      .reverse()
      .map((u) => ({
        ...u,
        def: ACHIEVEMENTS.find((a) => a.id === u.id),
      }))
      .filter((x) => Boolean(x.def));
  }, [profile.unlockedAchievements]);

  const exploredOpeningDefs = useMemo(() => {
    return profile.exploredOpenings
      .map((id) => OPENINGS.find((o) => o.id === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .slice(0, 3);
  }, [profile.exploredOpenings]);

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Actions */}
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
              One Board. Infinite Possibilities.
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#292720] dark:text-[#F3EBDD]">
              Welcome back, {profile.username}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#756F63] dark:text-[#B8B0A2]">
              <span>{profile.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Rating {profile.rating}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Level {levelInfo.level}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{profile.xp} XP</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('quick-play')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              <span>Quick Play</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('play-ai')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-sm font-semibold text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#35312A] transition-colors whitespace-nowrap"
            >
              <Cpu className="w-4 h-4" />
              <span>Play vs AI</span>
            </button>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-5 pt-4 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#756F63] dark:text-[#B8B0A2]">
              Level {levelInfo.level} Progression
            </span>
            <span className="font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
              {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP to Level {levelInfo.level + 1}
            </span>
          </div>
          <div className="h-2 w-full rounded-sm bg-[#EAE2D4] dark:bg-[#2B2822] overflow-hidden">
            <div
              className="h-full bg-[#292720] dark:bg-[#D8CDBB] transition-all duration-300"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Performance, Match History, Openings */}
        <div className="lg:col-span-7 space-y-6">
          {/* Performance Overview */}
          <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Performance Overview</h2>
              <button
                type="button"
                onClick={() => navigate('statistics')}
                className="text-xs font-medium text-[#756F63] hover:text-[#292720] dark:hover:text-[#F3EBDD] inline-flex items-center gap-1"
              >
                <span>Full stats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-[#F3EBDD]/60 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028]">
                <div className="text-[11px] text-[#756F63] dark:text-[#9B9386]">Arena Rating</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold">{profile.rating}</div>
              </div>
              <div className="p-3 rounded-md bg-[#F3EBDD]/60 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028]">
                <div className="text-[11px] text-[#756F63] dark:text-[#9B9386]">Matches Played</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold">{stats.total}</div>
              </div>
              <div className="p-3 rounded-md bg-[#F3EBDD]/60 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028]">
                <div className="text-[11px] text-[#756F63] dark:text-[#9B9386]">Win Rate</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold">
                  {stats.total > 0 ? `${stats.winRate}%` : '—'}
                </div>
              </div>
              <div className="p-3 rounded-md bg-[#F3EBDD]/60 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028]">
                <div className="text-[11px] text-[#756F63] dark:text-[#9B9386]">Puzzles Solved</div>
                <div className="mt-1 font-mono tabular-nums text-xl font-bold">
                  {profile.puzzlesSolved}
                </div>
              </div>
            </div>

            {stats.favoriteTimeControls.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E6DDCE] dark:border-[#2F2B24] flex flex-wrap items-center gap-3 text-xs text-[#756F63] dark:text-[#B8B0A2]">
                <span className="font-medium">Favorite time controls:</span>
                {stats.favoriteTimeControls.map(([tc, count]) => (
                  <span key={tc} className="font-mono tabular-nums">
                    {tc} ({count} {count === 1 ? 'game' : 'games'})
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Recent Match History (Real data or clean New-User Empty State) */}
          <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Recent Match History</h2>
              {profile.matchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('match-history')}
                  className="text-xs font-medium text-[#756F63] hover:text-[#292720] dark:hover:text-[#F3EBDD] inline-flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {profile.matchHistory.length === 0 ? (
              <div className="py-7 px-4 text-center border border-dashed border-[#D8CDBB] dark:border-[#3B362E] rounded-md bg-[#F3EBDD]/40 dark:bg-[#2B2822]/30">
                <p className="text-sm font-medium text-[#292720] dark:text-[#F3EBDD]">
                  No completed matches recorded yet
                </p>
                <p className="mt-1 text-xs text-[#756F63] dark:text-[#9B9386] max-w-md mx-auto">
                  Start with a 10+0 Quick Play match, test an AI personality, or challenge the opening stage of Chess Royale. Every completed game updates your real rating and history here.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('play-ai')}
                    className="px-3.5 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
                  >
                    Start First Match vs AI
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('chess-royale')}
                    className="px-3.5 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                  >
                    Enter Chess Royale
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
                {profile.matchHistory.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            m.result === 'win'
                              ? 'text-[#2D6A4F] dark:text-[#52B788]'
                              : m.result === 'loss'
                                ? 'text-[#9B2226] dark:text-[#E05A5A]'
                                : 'text-[#756F63] dark:text-[#B8B0A2]'
                          }`}
                        >
                          {m.result === 'win' ? 'Win' : m.result === 'loss' ? 'Loss' : 'Draw'}
                        </span>
                        <span className="font-medium truncate">vs {m.opponentName}</span>
                      </div>
                      <div className="text-xs text-[#756F63] dark:text-[#9B9386] flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono tabular-nums">{m.timeControlLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.termination}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{m.moveCount} moves</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGameReview(m.pgn)}
                      className="px-2.5 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recently Explored Openings & Recommendations */}
          <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">
                {exploredOpeningDefs.length > 0 ? 'Recently Explored Openings' : 'Recommended Explorations'}
              </h2>
              <button
                type="button"
                onClick={() => navigate('opening-lab')}
                className="text-xs font-medium text-[#756F63] hover:text-[#292720] dark:hover:text-[#F3EBDD] inline-flex items-center gap-1"
              >
                <span>Open Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {exploredOpeningDefs.length > 0 ? (
              <div className="divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
                {exploredOpeningDefs.map((op) => (
                  <div key={op.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{op.name}</div>
                      <div className="text-xs text-[#756F63] dark:text-[#9B9386]">
                        {op.eco} · {op.family}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('opening-lab')}
                      className="text-xs font-medium text-[#292720] dark:text-[#F3EBDD] underline underline-offset-4"
                    >
                      Study
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('opening-lab')}
                  className="text-left p-3 rounded-md border border-[#E6DDCE] dark:border-[#353028] hover:border-[#292720] dark:hover:border-[#B8B0A2] transition-colors"
                >
                  <BookOpen className="w-4 h-4 mb-2 text-[#756F63]" />
                  <div className="text-sm font-semibold">Opening Lab</div>
                  <p className="text-xs text-[#756F63] dark:text-[#9B9386] mt-0.5">
                    Study Ruy Lopez, Sicilian Najdorf & QGD lines.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('chess-time-machine')}
                  className="text-left p-3 rounded-md border border-[#E6DDCE] dark:border-[#353028] hover:border-[#292720] dark:hover:border-[#B8B0A2] transition-colors"
                >
                  <Crown className="w-4 h-4 mb-2 text-[#756F63]" />
                  <div className="text-sm font-semibold">Time Machine</div>
                  <p className="text-xs text-[#756F63] dark:text-[#9B9386] mt-0.5">
                    Replay The Opera Game (1858) & branch lines.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('chess-detective')}
                  className="text-left p-3 rounded-md border border-[#E6DDCE] dark:border-[#353028] hover:border-[#292720] dark:hover:border-[#B8B0A2] transition-colors"
                >
                  <SearchCheck className="w-4 h-4 mb-2 text-[#756F63]" />
                  <div className="text-sm font-semibold">Chess Detective</div>
                  <p className="text-xs text-[#756F63] dark:text-[#9B9386] mt-0.5">
                    Review any PGN for inaccuracies & tactics.
                  </p>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Daily Puzzle + Recent Achievements */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Puzzle */}
          <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-base font-semibold">Daily Puzzle</h2>
                <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
                  {dailyPuzzle.title} · Rating {dailyPuzzle.rating}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${
                  isDailySolved
                    ? 'text-[#2D6A4F] dark:text-[#52B788]'
                    : 'text-[#756F63] dark:text-[#B8B0A2]'
                }`}
              >
                {isDailySolved ? 'Solved today' : 'Unsolved'}
              </span>
            </div>

            <div className="max-w-[280px] mx-auto my-3">
              <Chessboard2D
                fen={dailyPuzzle.fen}
                boardTheme={profile.customization.boardTheme}
                pieceSet={profile.customization.pieceSet}
                interactive={false}
                showCoordinates={false}
                maxSizePx={280}
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('chess-mystery')}
              className="w-full mt-2 py-2 px-4 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>{isDailySolved ? 'Review Daily Puzzle' : 'Solve Daily Puzzle'}</span>
            </button>
          </section>

          {/* Recent Achievements */}
          <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">Recent Achievements</h2>
              <button
                type="button"
                onClick={() => navigate('achievements')}
                className="text-xs font-medium text-[#756F63] hover:text-[#292720] dark:hover:text-[#F3EBDD] inline-flex items-center gap-1"
              >
                <span>All ({profile.unlockedAchievements.length}/{ACHIEVEMENTS.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentAchievements.length === 0 ? (
              <div className="py-4 text-xs text-[#756F63] dark:text-[#9B9386] flex items-center gap-2.5">
                <Award className="w-4 h-4 shrink-0" />
                <span>
                  Complete a match, solve a puzzle, or explore Opening Lab to unlock your first achievement.
                </span>
              </div>
            ) : (
              <div className="divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
                {recentAchievements.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{item.def?.title}</div>
                      <div className="text-xs text-[#756F63] dark:text-[#9B9386]">
                        {item.def?.description}
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#2D6A4F] dark:text-[#52B788] shrink-0">
                      +{item.def?.xpReward} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
