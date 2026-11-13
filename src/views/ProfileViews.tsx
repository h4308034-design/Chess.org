import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Check,
  History,
  Palette,
  RotateCcw,
  SearchCheck,
  Settings,
  Star,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BOARD_THEMES } from '../components/chess/BoardThemes';
import { ChessPieceSvg, PIECE_SET_OPTIONS } from '../components/chess/GeoPieces';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { OPENINGS } from '../data/openings';
import { ACHIEVEMENTS } from '../engine/progression';
import { AnimationSpeed, BoardThemeId, PieceSetId } from '../types/chess';

const AVAILABLE_TITLES = ['Enthusiast', 'Club Player', 'Tactician', 'Strategist', 'Royale Champion'];

// ============================================================================
// PERSONAL PROFILE
// ============================================================================
export const PersonalProfileView: React.FC = () => {
  const { profile, levelInfo, updateProfileMeta, navigate } = useApp();
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [titleInput, setTitleInput] = useState(profile.title);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMeta({ username: usernameInput, title: titleInput });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#EAE2D4] dark:bg-[#2B2822] border border-[#D8CDBB] dark:border-[#3B362E] flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-[#292720] dark:text-[#F3EBDD]" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#292720] dark:text-[#F3EBDD]">
              {profile.username}
            </h2>
            <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] font-mono tabular-nums">
              {profile.title} · Rating {profile.rating} · Level {levelInfo.level} ({profile.xp} XP)
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] mb-1.5">
                Display Username
              </label>
              <input
                type="text"
                maxLength={24}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] px-3 py-2 text-sm text-[#292720] dark:text-[#F3EBDD]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] mb-1.5">
                Profile Title
              </label>
              <select
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] px-3 py-2 text-sm text-[#292720] dark:text-[#F3EBDD]"
              >
                {AVAILABLE_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold hover:opacity-90"
            >
              Save Profile
            </button>
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs text-[#2D5E40] dark:text-[#7AC496]">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4">
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Games Played</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-1">
            {profile.matchHistory.length}
          </p>
        </div>
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4">
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Puzzle Rating</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-1">
            {profile.puzzleRating}
          </p>
        </div>
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4">
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Puzzles Solved</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-1">
            {profile.puzzlesSolved}
          </p>
        </div>
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4">
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Achievements</p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-1">
            {profile.unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('statistics')}
          className="px-3.5 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4]/50"
        >
          View Statistics
        </button>
        <button
          type="button"
          onClick={() => navigate('match-history')}
          className="px-3.5 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4]/50"
        >
          Match History
        </button>
        <button
          type="button"
          onClick={() => navigate('customization')}
          className="px-3.5 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4]/50"
        >
          Customize Board & Pieces
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STATISTICS
// ============================================================================
export const StatisticsView: React.FC = () => {
  const { profile, navigate } = useApp();

  const metrics = useMemo(() => {
    const games = profile.matchHistory;
    const wins = games.filter((g) => g.result === 'win').length;
    const draws = games.filter((g) => g.result === 'draw').length;
    const losses = games.filter((g) => g.result === 'loss').length;
    const winRate = games.length > 0 ? Math.round((wins / games.length) * 100) : 0;

    const whiteGames = games.filter((g) => g.playerColor === 'w');
    const blackGames = games.filter((g) => g.playerColor === 'b');
    const whiteWins = whiteGames.filter((g) => g.result === 'win').length;
    const blackWins = blackGames.filter((g) => g.result === 'win').length;

    const modeMap = new Map<string, { total: number; wins: number }>();
    for (const g of games) {
      const prev = modeMap.get(g.mode) ?? { total: 0, wins: 0 };
      modeMap.set(g.mode, { total: prev.total + 1, wins: prev.wins + (g.result === 'win' ? 1 : 0) });
    }

    return {
      total: games.length,
      wins,
      draws,
      losses,
      winRate,
      whiteTotal: whiteGames.length,
      whiteWinRate: whiteGames.length > 0 ? Math.round((whiteWins / whiteGames.length) * 100) : 0,
      blackTotal: blackGames.length,
      blackWinRate: blackGames.length > 0 ? Math.round((blackWins / blackGames.length) * 100) : 0,
      byMode: Array.from(modeMap.entries()),
    };
  }, [profile.matchHistory]);

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Verified Performance Metrics</span>
        </div>
        <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
          Chess.org Career Statistics
        </h2>
      </section>

      {metrics.total === 0 ? (
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[#292720] dark:text-[#F3EBDD]">
            No completed games recorded yet
          </p>
          <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] max-w-md mx-auto">
            Statistics reflect your actual completed games across AI, Online Multiplayer, Chaos, and Royale.
          </p>
          <button
            type="button"
            onClick={() => navigate('play-ai')}
            className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
          >
            Play Your First Game
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-2">
            <h3 className="text-xs font-semibold text-[#756F63] dark:text-[#9B9386]">Overall Record</h3>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#292720] dark:text-[#F3EBDD]">
              {metrics.wins}W · {metrics.draws}D · {metrics.losses}L
            </p>
            <p className="font-mono tabular-nums text-xs text-[#756F63] dark:text-[#B8B0A2]">
              Win Rate: {metrics.winRate}% across {metrics.total} games
            </p>
          </div>

          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-2">
            <h3 className="text-xs font-semibold text-[#756F63] dark:text-[#9B9386]">By Piece Color</h3>
            <div className="space-y-1 text-xs font-mono tabular-nums text-[#292720] dark:text-[#F3EBDD]">
              <div className="flex justify-between">
                <span>White ({metrics.whiteTotal} games)</span>
                <span>{metrics.whiteWinRate}% wins</span>
              </div>
              <div className="flex justify-between">
                <span>Black ({metrics.blackTotal} games)</span>
                <span>{metrics.blackWinRate}% wins</span>
              </div>
            </div>
          </div>

          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-2">
            <h3 className="text-xs font-semibold text-[#756F63] dark:text-[#9B9386]">Tactics & Rush</h3>
            <div className="space-y-1 text-xs font-mono tabular-nums text-[#292720] dark:text-[#F3EBDD]">
              <div className="flex justify-between">
                <span>Puzzle Rating</span>
                <span>{profile.puzzleRating}</span>
              </div>
              <div className="flex justify-between">
                <span>Rush Timed Best</span>
                <span>{profile.puzzleRushBestTimed}</span>
              </div>
              <div className="flex justify-between">
                <span>Rush Untimed Best</span>
                <span>{profile.puzzleRushBestUntimed}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#292720] dark:text-[#F3EBDD]">
              Performance by Mode
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metrics.byMode.map(([modeKey, data]) => (
                <div
                  key={modeKey}
                  className="rounded-md border border-[#E6DDCE] dark:border-[#2F2B24] p-3 text-xs"
                >
                  <p className="uppercase font-semibold text-[#756F63] dark:text-[#9B9386]">{modeKey}</p>
                  <p className="font-mono tabular-nums text-base font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
                    {data.wins}/{data.total} wins
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MATCH HISTORY
// ============================================================================
export const MatchHistoryView: React.FC = () => {
  const { profile, openGameReview, navigate } = useApp();
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');

  const filtered = profile.matchHistory.filter(
    (m) => resultFilter === 'all' || m.result === resultFilter,
  );

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
            <History className="w-3.5 h-3.5" />
            <span>Archive</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
            Match History ({profile.matchHistory.length})
          </h2>
        </div>

        <div className="flex gap-1.5">
          {(['all', 'win', 'draw', 'loss'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setResultFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize border ${
                resultFilter === f
                  ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] text-[#756F63] dark:text-[#B8B0A2]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[#292720] dark:text-[#F3EBDD]">
            {profile.matchHistory.length === 0
              ? 'No matches played yet'
              : 'No matches match this filter'}
          </p>
          <button
            type="button"
            onClick={() => navigate('quick-play')}
            className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
          >
            Start a Match
          </button>
        </div>
      ) : (
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-semibold uppercase ${
                      m.result === 'win'
                        ? 'text-[#2D5E40] dark:text-[#7AC496]'
                        : m.result === 'loss'
                          ? 'text-[#8B2323] dark:text-[#E36D6D]'
                          : 'text-[#756F63] dark:text-[#B8B0A2]'
                    }`}
                  >
                    {m.result}
                  </span>
                  <span className="font-semibold text-[#292720] dark:text-[#F3EBDD]">
                    vs {m.opponentName}
                  </span>
                  <span className="text-[#9B9386]">·</span>
                  <span className="uppercase text-[#756F63] dark:text-[#B8B0A2]">{m.mode}</span>
                  <span className="text-[#9B9386]">·</span>
                  <span className="font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
                    {m.timeControlLabel}
                  </span>
                </div>
                <p className="text-[#756F63] dark:text-[#9B9386]">
                  {m.termination} · {m.moveCount} plies · {new Date(m.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono tabular-nums text-[#292720] dark:text-[#F3EBDD]">
                  {m.ratingDelta >= 0 ? `+${m.ratingDelta}` : m.ratingDelta} Elo · +{m.xpEarned} XP
                </span>
                {m.pgn.trim() && (
                  <button
                    type="button"
                    onClick={() => openGameReview(m.pgn)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] font-semibold text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4]"
                  >
                    <SearchCheck className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FAVORITE OPENINGS
// ============================================================================
export const FavoriteOpeningsView: React.FC = () => {
  const { profile, toggleFavoriteOpening, navigate } = useApp();

  const favoriteDefs = OPENINGS.filter((o) => profile.favoriteOpenings.includes(o.id));
  const exploredDefs = OPENINGS.filter(
    (o) => profile.exploredOpenings.includes(o.id) && !profile.favoriteOpenings.includes(o.id),
  );

  return (
    <div className="space-y-5">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Opening Repertoire</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
            Favorite & Explored Openings
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('opening-lab')}
          className="px-3.5 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
        >
          Open Opening Lab
        </button>
      </section>

      {favoriteDefs.length === 0 && exploredDefs.length === 0 ? (
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-8 text-center space-y-3">
          <p className="text-sm font-medium text-[#292720] dark:text-[#F3EBDD]">
            No openings saved or explored yet
          </p>
          <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
            Visit Opening Lab to step through classical lines and bookmark your favorites.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...favoriteDefs, ...exploredDefs].map((op) => {
            const isFav = profile.favoriteOpenings.includes(op.id);
            return (
              <div
                key={op.id}
                className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] text-[#756F63] dark:text-[#9B9386]">
                      {op.eco} · {op.family}
                    </span>
                    <h3 className="font-display text-base font-bold text-[#292720] dark:text-[#F3EBDD]">
                      {op.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteOpening(op.id)}
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    className="p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isFav ? 'fill-[#8F651E] text-[#8F651E]' : 'text-[#9B9386]'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">{op.description}</p>
                <p className="font-mono text-xs text-[#292720] dark:text-[#F3EBDD]">
                  {op.mainLine.map((m) => m.san).join(' ')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CUSTOMIZATION (THEMES, PIECE SETS, 2D/3D)
// ============================================================================
export const CustomizationView: React.FC = () => {
  const { profile, updateCustomization } = useApp();
  const c = profile.customization;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-5 items-start">
      <div className="space-y-5">
        {/* Board Themes */}
        <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
            <Palette className="w-4 h-4" />
            <span>Board Theme</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
              const t = BOARD_THEMES[id];
              const active = c.boardTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateCustomization({ boardTheme: id })}
                  className={`flex items-center gap-3 p-3 rounded-md border text-left transition-colors ${
                    active
                      ? 'border-[#292720] dark:border-[#F3EBDD] bg-[#F3EBDD]/70 dark:bg-[#2B2822]'
                      : 'border-[#E6DDCE] dark:border-[#2F2B24] hover:bg-[#EAE2D4]/40'
                  }`}
                >
                  <div className="grid grid-cols-2 w-8 h-8 rounded overflow-hidden border border-[#D8CDBB] shrink-0">
                    <div style={{ backgroundColor: t.lightSquare }} />
                    <div style={{ backgroundColor: t.darkSquare }} />
                    <div style={{ backgroundColor: t.darkSquare }} />
                    <div style={{ backgroundColor: t.lightSquare }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
                      {t.name}
                    </p>
                    <p className="text-[11px] text-[#756F63] dark:text-[#9B9386] truncate">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Piece Sets */}
        <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
          <h3 className="text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">Piece Set</h3>
          <div className="space-y-2.5">
            {PIECE_SET_OPTIONS.map((opt) => {
              const active = c.pieceSet === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateCustomization({ pieceSet: opt.id as PieceSetId })}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-md border text-left transition-colors ${
                    active
                      ? 'border-[#292720] dark:border-[#F3EBDD] bg-[#F3EBDD]/70 dark:bg-[#2B2822]'
                      : 'border-[#E6DDCE] dark:border-[#2F2B24] hover:bg-[#EAE2D4]/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
                      {opt.name}
                    </p>
                    <p className="text-[11px] text-[#756F63] dark:text-[#9B9386] mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-7 h-7">
                      <ChessPieceSvg type="k" color="w" pieceSet={opt.id} />
                    </div>
                    <div className="w-7 h-7">
                      <ChessPieceSvg type="n" color="b" pieceSet={opt.id} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Board Preferences */}
        <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3 text-xs">
          <h3 className="font-semibold text-[#292720] dark:text-[#F3EBDD]">Board & Motion</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#756F63] dark:text-[#9B9386] mb-1">Default View</label>
              <div className="flex gap-2">
                {(['2d', '3d'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateCustomization({ defaultBoardMode: m })}
                    className={`flex-1 py-1.5 rounded border font-semibold uppercase ${
                      c.defaultBoardMode === m
                        ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                        : 'border-[#D8CDBB] dark:border-[#3B362E]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#756F63] dark:text-[#9B9386] mb-1">Animation Speed</label>
              <select
                value={c.animationSpeed}
                onChange={(e) =>
                  updateCustomization({ animationSpeed: e.target.value as AnimationSpeed })
                }
                className="w-full rounded border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] px-2.5 py-1.5 text-[#292720] dark:text-[#F3EBDD]"
              >
                <option value="instant">Instant</option>
                <option value="fast">Fast</option>
                <option value="normal">Normal</option>
                <option value="smooth">Smooth</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-[#292720] dark:text-[#F3EBDD]">
              <input
                type="checkbox"
                checked={c.showCoordinates}
                onChange={(e) => updateCustomization({ showCoordinates: e.target.checked })}
                className="accent-[#292720]"
              />
              <span>Show board coordinates</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-[#292720] dark:text-[#F3EBDD]">
              <input
                type="checkbox"
                checked={c.highlightLegalMoves}
                onChange={(e) => updateCustomization({ highlightLegalMoves: e.target.checked })}
                className="accent-[#292720]"
              />
              <span>Highlight legal moves</span>
            </label>
          </div>
        </section>
      </div>

      {/* Live Preview */}
      <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
        <p className="text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
          Live Board Preview ({BOARD_THEMES[c.boardTheme].name} · {c.pieceSet.toUpperCase()})
        </p>
        <Chessboard2D
          fen="r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3"
          boardTheme={c.boardTheme}
          pieceSet={c.pieceSet}
          showCoordinates={c.showCoordinates}
          highlightLegalMoves={c.highlightLegalMoves}
          interactive={false}
          maxSizePx={380}
        />
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS
// ============================================================================
export const SettingsView: React.FC = () => {
  const { profile, updateCustomization, resetAllData } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const c = profile.customization;

  return (
    <div className="space-y-5 max-w-2xl">
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
          <Settings className="w-3.5 h-3.5" />
          <span>Application Preferences</span>
        </div>
        <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD]">
          Settings
        </h2>

        <div className="space-y-3 pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24] text-xs">
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="font-semibold text-[#292720] dark:text-[#F3EBDD]">Appearance Theme</p>
              <p className="text-[#756F63] dark:text-[#9B9386]">
                Switch between Warm Ivory Light and Warm Charcoal Dark mode.
              </p>
            </div>
            <div className="flex gap-1.5">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateCustomization({ appearance: mode })}
                  className={`px-3 py-1.5 rounded border capitalize font-medium ${
                    c.appearance === mode
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E] text-[#292720] dark:text-[#F3EBDD]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
            <div>
              <p className="font-semibold text-[#292720] dark:text-[#F3EBDD]">Chess Audio Feedback</p>
              <p className="text-[#756F63] dark:text-[#9B9386]">
                Procedural Web Audio tones for moves, captures, checks, and game over.
              </p>
            </div>
            <input
              type="checkbox"
              checked={c.soundEnabled}
              onChange={(e) => updateCustomization({ soundEnabled: e.target.checked })}
              className="accent-[#292720] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between gap-4 py-1 cursor-pointer">
            <div>
              <p className="font-semibold text-[#292720] dark:text-[#F3EBDD]">Evaluation Bar</p>
              <p className="text-[#756F63] dark:text-[#9B9386]">
                Display engine advantage meter alongside analysis and review boards.
              </p>
            </div>
            <input
              type="checkbox"
              checked={c.evaluationBarVisible}
              onChange={(e) => updateCustomization({ evaluationBarVisible: e.target.checked })}
              className="accent-[#292720] w-4 h-4"
            />
          </label>
        </div>
      </section>

      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3 text-xs">
        <h3 className="font-display text-sm font-bold text-[#8B2323] dark:text-[#E36D6D]">
          Reset Local Data
        </h3>
        <p className="text-[#756F63] dark:text-[#B8B0A2]">
          Clears your local profile, match history, rating, puzzle records, and preferences back to defaults.
        </p>
        {!confirmReset ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#8B2323]/40 text-[#8B2323] dark:text-[#E36D6D] font-semibold hover:bg-[#8B2323]/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Local Data</span>
            </button>
            {resetDone && (
              <span className="text-[#2D5E40] dark:text-[#7AC496]">Local profile reset.</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAllData();
                setConfirmReset(false);
                setResetDone(true);
                setTimeout(() => setResetDone(false), 2500);
              }}
              className="px-3.5 py-2 rounded-md bg-[#8B2323] text-[#FAF5EC] font-semibold"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3.5 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E]"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
