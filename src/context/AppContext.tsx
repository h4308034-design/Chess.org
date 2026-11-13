import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  BoardThemeId,
  MatchRecord,
  NavSection,
  PieceSetId,
  UserCustomization,
  UserProfile,
} from '../types/chess';
import {
  applyMatchCompletion,
  calculateLevelFromXp,
  createInitialUserProfile,
  evaluateAchievements,
  ROYALE_STAGES,
} from '../engine/progression';

const STORAGE_KEY = 'chess_org_profile_v1';

interface AppContextValue {
  activeSection: NavSection;
  navigate: (section: NavSection) => void;
  profile: UserProfile;
  levelInfo: ReturnType<typeof calculateLevelFromXp>;
  reviewPgn: string | null;
  openGameReview: (pgn: string) => void;
  recordMatch: (match: MatchRecord) => void;
  recordPuzzleSolved: (isDaily: boolean, dateKey?: string, ratingGain?: number) => void;
  recordPuzzleRushBest: (mode: 'timed' | 'untimed', score: number) => void;
  recordOpeningExplored: (openingId: string) => void;
  toggleFavoriteOpening: (openingId: string) => void;
  recordRoyaleStageWin: (stageNumber: number) => void;
  updateCustomization: (patch: Partial<UserCustomization>) => void;
  updateProfileMeta: (patch: { username?: string; title?: string }) => void;
  resetAllData: () => void;
  clientId: string;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadStoredProfile(): UserProfile {
  if (typeof window === 'undefined') return createInitialUserProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialUserProfile();
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    const defaults = createInitialUserProfile();
    return {
      ...defaults,
      ...parsed,
      customization: {
        ...defaults.customization,
        ...(parsed.customization ?? {}),
      },
    };
  } catch {
    return createInitialUserProfile();
  }
}

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'client-ssr';
  const key = 'chess_org_client_id';
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = `c-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [profile, setProfile] = useState<UserProfile>(loadStoredProfile);
  const [reviewPgn, setReviewPgn] = useState<string | null>(null);
  const [clientId] = useState<string>(getOrCreateClientId);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (profile.customization.appearance === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [profile.customization.appearance]);

  // Persist to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore quota errors
    }
  }, [profile]);

  const syncLeaderboard = useCallback((p: UserProfile) => {
    const wins = p.matchHistory.filter((m) => m.result === 'win').length;
    fetch('/api/leaderboard/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: p.username,
        rating: p.rating,
        wins,
        games: p.matchHistory.length,
        xp: p.xp,
      }),
    }).catch(() => {});
  }, []);

  const navigate = useCallback((section: NavSection) => {
    setActiveSection(section);
  }, []);

  const openGameReview = useCallback((pgn: string) => {
    setReviewPgn(pgn);
    setActiveSection('chess-detective');
  }, []);

  const recordMatch = useCallback(
    (match: MatchRecord) => {
      setProfile((prev) => {
        const next = applyMatchCompletion(prev, match);
        syncLeaderboard(next);
        return next;
      });
    },
    [syncLeaderboard],
  );

  const recordPuzzleSolved = useCallback((isDaily: boolean, dateKey?: string, ratingGain = 12) => {
    setProfile((prev) => {
      const dailyDates =
        isDaily && dateKey && !prev.dailyPuzzleSolvedDates.includes(dateKey)
          ? [...prev.dailyPuzzleSolvedDates, dateKey]
          : prev.dailyPuzzleSolvedDates;
      const updated = evaluateAchievements({
        ...prev,
        puzzlesSolved: prev.puzzlesSolved + 1,
        puzzleRating: prev.puzzleRating + ratingGain,
        xp: prev.xp + (isDaily ? 35 : 20),
        dailyPuzzleSolvedDates: dailyDates,
      });
      return updated;
    });
  }, []);

  const recordPuzzleRushBest = useCallback((mode: 'timed' | 'untimed', score: number) => {
    setProfile((prev) => {
      const updated = evaluateAchievements({
        ...prev,
        puzzleRushBestTimed:
          mode === 'timed' ? Math.max(prev.puzzleRushBestTimed, score) : prev.puzzleRushBestTimed,
        puzzleRushBestUntimed:
          mode === 'untimed'
            ? Math.max(prev.puzzleRushBestUntimed, score)
            : prev.puzzleRushBestUntimed,
        xp: prev.xp + score * 8,
      });
      return updated;
    });
  }, []);

  const recordOpeningExplored = useCallback((openingId: string) => {
    setProfile((prev) => {
      if (prev.exploredOpenings.includes(openingId)) return prev;
      return evaluateAchievements({
        ...prev,
        exploredOpenings: [openingId, ...prev.exploredOpenings].slice(0, 20),
        xp: prev.xp + 15,
      });
    });
  }, []);

  const toggleFavoriteOpening = useCallback((openingId: string) => {
    setProfile((prev) => {
      const exists = prev.favoriteOpenings.includes(openingId);
      return {
        ...prev,
        favoriteOpenings: exists
          ? prev.favoriteOpenings.filter((id) => id !== openingId)
          : [...prev.favoriteOpenings, openingId],
      };
    });
  }, []);

  const recordRoyaleStageWin = useCallback((stageNumber: number) => {
    const stageDef = ROYALE_STAGES.find((s) => s.stage === stageNumber);
    setProfile((prev) => {
      const nextStreak = prev.royaleStreak + 1;
      const unlockedThemes: BoardThemeId[] =
        stageDef?.unlockTheme && !prev.unlockedThemes.includes(stageDef.unlockTheme)
          ? [...prev.unlockedThemes, stageDef.unlockTheme]
          : prev.unlockedThemes;
      return evaluateAchievements({
        ...prev,
        royaleStageReached: Math.max(prev.royaleStageReached, Math.min(5, stageNumber + 1)),
        royaleStreak: nextStreak,
        royaleBestStreak: Math.max(prev.royaleBestStreak, nextStreak),
        xp: prev.xp + (stageDef?.xpReward ?? 100),
        title: stageDef?.unlockTitle ?? prev.title,
        unlockedThemes,
      });
    });
  }, []);

  const updateCustomization = useCallback((patch: Partial<UserCustomization>) => {
    setProfile((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        ...patch,
      },
    }));
  }, []);

  const updateProfileMeta = useCallback((patch: { username?: string; title?: string }) => {
    setProfile((prev) => ({
      ...prev,
      ...(patch.username !== undefined ? { username: patch.username.trim() || 'Player' } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
    }));
  }, []);

  const resetAllData = useCallback(() => {
    const fresh = createInitialUserProfile();
    setProfile(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const levelInfo = calculateLevelFromXp(profile.xp);

  return (
    <AppContext.Provider
      value={{
        activeSection,
        navigate,
        profile,
        levelInfo,
        reviewPgn,
        openGameReview,
        recordMatch,
        recordPuzzleSolved,
        recordPuzzleRushBest,
        recordOpeningExplored,
        toggleFavoriteOpening,
        recordRoyaleStageWin,
        updateCustomization,
        updateProfileMeta,
        resetAllData,
        clientId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export type { BoardThemeId, PieceSetId };
