import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './views/DashboardView';
import { PlayView } from './views/PlayView';
import { ChaosView } from './views/ChaosView';
import { RoyaleView } from './views/RoyaleView';
import { DimensionView } from './views/DimensionView';
import { MysteryAndPuzzlesView, PuzzleRushView } from './views/PuzzleViews';
import { TimeMachineView } from './views/TimeMachineView';
import { BlindfoldChessView, GuessTheEloView, OpeningLabView } from './views/TrainViews';
import {
  EngineAnalysisView,
  GameReviewAndDetectiveView,
  PgnExplorerView,
} from './views/AnalyzeViews';
import {
  AchievementsView,
  LeaderboardsView,
  TournamentsView,
  XpLevelsView,
} from './views/CompeteViews';
import {
  CustomizationView,
  FavoriteOpeningsView,
  MatchHistoryView,
  PersonalProfileView,
  SettingsView,
  StatisticsView,
} from './views/ProfileViews';

const ActiveSectionRouter: React.FC = () => {
  const { activeSection } = useApp();

  switch (activeSection) {
    case 'dashboard':
      return <DashboardView />;
    case 'quick-play':
      return <PlayView initialMode="quick" />;
    case 'play-ai':
      return <PlayView initialMode="ai" />;
    case 'online-multiplayer':
      return <PlayView initialMode="online" />;
    case 'local-multiplayer':
      return <PlayView initialMode="local" />;
    case 'custom-game':
      return <PlayView initialMode="custom" />;
    case 'chess-chaos':
      return <ChaosView />;
    case 'chess-royale':
      return <RoyaleView />;
    case 'chess-dimension':
      return <DimensionView />;
    case 'chess-mystery':
      return <MysteryAndPuzzlesView title="Chess Mystery" />;
    case 'chess-time-machine':
      return <TimeMachineView />;
    case 'chess-puzzles':
      return <MysteryAndPuzzlesView />;
    case 'puzzle-rush':
      return <PuzzleRushView />;
    case 'opening-lab':
      return <OpeningLabView />;
    case 'blindfold-chess':
      return <BlindfoldChessView />;
    case 'guess-the-elo':
      return <GuessTheEloView />;
    case 'game-review':
      return <GameReviewAndDetectiveView />;
    case 'chess-detective':
      return <GameReviewAndDetectiveView isDetective />;
    case 'engine-analysis':
      return <EngineAnalysisView />;
    case 'pgn-explorer':
      return <PgnExplorerView />;
    case 'leaderboards':
      return <LeaderboardsView />;
    case 'tournaments':
      return <TournamentsView />;
    case 'achievements':
      return <AchievementsView />;
    case 'xp-levels':
      return <XpLevelsView />;
    case 'personal-profile':
      return <PersonalProfileView />;
    case 'statistics':
      return <StatisticsView />;
    case 'match-history':
      return <MatchHistoryView />;
    case 'favorite-openings':
      return <FavoriteOpeningsView />;
    case 'customization':
      return <CustomizationView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <ActiveSectionRouter />
      </AppShell>
    </AppProvider>
  );
}
