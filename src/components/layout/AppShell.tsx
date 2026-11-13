import React, { useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Compass,
  Cpu,
  Crown,
  EyeOff,
  FileCode2,
  Flame,
  Gamepad2,
  Globe,
  HelpCircle,
  History,
  Home,
  LayoutGrid,
  Menu,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  SearchCheck,
  Settings,
  Sliders,
  Sparkles,
  Sun,
  Swords,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { NavSection } from '../../types/chess';
import { useApp } from '../../context/AppContext';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'HOME',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }],
  },
  {
    group: 'PLAY',
    items: [
      { id: 'quick-play', label: 'Quick Play', icon: Zap },
      { id: 'play-ai', label: 'Play vs AI', icon: Cpu },
      { id: 'online-multiplayer', label: 'Online Multiplayer', icon: Globe },
      { id: 'local-multiplayer', label: 'Local Multiplayer', icon: Users },
      { id: 'custom-game', label: 'Custom Game', icon: Sliders },
    ],
  },
  {
    group: 'EXPLORE',
    items: [
      { id: 'chess-chaos', label: 'Chess Chaos', icon: Flame },
      { id: 'chess-royale', label: 'Chess Royale', icon: Crown },
      { id: 'chess-dimension', label: 'Chess Dimension', icon: LayoutGrid },
      { id: 'chess-mystery', label: 'Chess Mystery', icon: Puzzle },
      { id: 'chess-time-machine', label: 'Chess Time Machine', icon: Compass },
    ],
  },
  {
    group: 'TRAIN',
    items: [
      { id: 'chess-puzzles', label: 'Chess Puzzles', icon: Swords },
      { id: 'puzzle-rush', label: 'Puzzle Rush', icon: Activity },
      { id: 'opening-lab', label: 'Opening Lab', icon: BookOpen },
      { id: 'blindfold-chess', label: 'Blindfold Chess', icon: EyeOff },
      { id: 'guess-the-elo', label: 'Guess the Elo', icon: HelpCircle },
    ],
  },
  {
    group: 'ANALYZE',
    items: [
      { id: 'game-review', label: 'Game Review', icon: SearchCheck },
      { id: 'chess-detective', label: 'Chess Detective', icon: Sparkles },
      { id: 'engine-analysis', label: 'Engine Analysis', icon: Gamepad2 },
      { id: 'pgn-explorer', label: 'PGN Explorer', icon: FileCode2 },
    ],
  },
  {
    group: 'COMPETE',
    items: [
      { id: 'leaderboards', label: 'Leaderboards', icon: BarChart3 },
      { id: 'tournaments', label: 'Tournaments', icon: Trophy },
      { id: 'achievements', label: 'Achievements', icon: Award },
      { id: 'xp-levels', label: 'XP and Levels', icon: Crown },
    ],
  },
  {
    group: 'PROFILE',
    items: [
      { id: 'personal-profile', label: 'Personal Profile', icon: User },
      { id: 'statistics', label: 'Statistics', icon: BarChart3 },
      { id: 'match-history', label: 'Match History', icon: History },
      { id: 'favorite-openings', label: 'Favorite Openings', icon: BookOpen },
      { id: 'customization', label: 'Customization', icon: Palette },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

function findSectionMeta(id: NavSection): { group: string; label: string } {
  for (const g of NAV_GROUPS) {
    const found = g.items.find((i) => i.id === id);
    if (found) return { group: g.group, label: found.label };
  }
  return { group: 'HOME', label: 'Dashboard' };
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeSection, navigate, profile, levelInfo, updateCustomization } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const meta = findSectionMeta(activeSection);
  const isDark = profile.customization.appearance === 'dark';

  const handleNavClick = (id: NavSection) => {
    navigate(id);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F3EBDD] dark:bg-[#191714] text-[#292720] dark:text-[#F3EBDD]">
      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-[#D8CDBB] dark:border-[#3B362E] bg-[#EAE2D4]/75 dark:bg-[#23201B] transition-all duration-150 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
        aria-label="Primary Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-[#D8CDBB] dark:border-[#3B362E]">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-[#292720]"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <rect x="2" y="2" width="10" height="10" fill="currentColor" opacity="0.88" />
                <rect x="12" y="2" width="10" height="10" fill="currentColor" opacity="0.2" />
                <rect x="2" y="12" width="10" height="10" fill="currentColor" opacity="0.2" />
                <rect x="12" y="12" width="10" height="10" fill="currentColor" opacity="0.88" />
              </svg>
              <span className="font-display font-bold text-base tracking-tight whitespace-nowrap">
                Chess.org
              </span>
            </button>
          )}
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="p-1.5 rounded-md text-[#756F63] hover:text-[#292720] dark:text-[#B8B0A2] dark:hover:text-[#F3EBDD] hover:bg-[#DFD5C3]/70 dark:hover:bg-[#2B2822]"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              {!sidebarCollapsed && (
                <div className="px-2.5 mb-1 text-[10px] font-semibold tracking-[0.08em] text-[#9B9386] dark:text-[#857D70]">
                  {group.group}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[5px] text-[13px] transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-medium'
                            : 'text-[#595347] dark:text-[#B8B0A2] hover:bg-[#DFD5C3]/75 dark:hover:bg-[#2B2822] hover:text-[#292720] dark:hover:text-[#F3EBDD]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Compact Footer Summary */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-[#D8CDBB] dark:border-[#3B362E] text-xs">
            <div className="flex items-center justify-between font-medium">
              <span className="truncate">{profile.username}</span>
              <span className="font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
                {profile.rating}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#756F63] dark:text-[#9B9386]">
              <span>Level {levelInfo.level}</span>
              <span className="font-mono tabular-nums">{profile.xp} XP</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 shrink-0 px-4 lg:px-6 border-b border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF]/80 dark:bg-[#23201B]/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="lg:hidden font-display font-bold text-base tracking-tight whitespace-nowrap shrink-0"
            >
              Chess.org
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#756F63] dark:text-[#9B9386] truncate">
              <span className="font-medium tracking-wide">{meta.group}</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#292720] dark:text-[#F3EBDD] font-semibold truncate">
                {meta.label}
              </span>
            </div>
            <span className="sm:hidden text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] truncate">
              {meta.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-xs text-[#756F63] dark:text-[#B8B0A2] font-mono tabular-nums">
              <span>Rating {profile.rating}</span>
              <span aria-hidden="true">·</span>
              <span>Lv {levelInfo.level}</span>
            </div>

            <button
              type="button"
              aria-label={isDark ? 'Switch to light warm ivory theme' : 'Switch to dark charcoal theme'}
              onClick={() => updateCustomization({ appearance: isDark ? 'light' : 'dark' })}
              className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#36322A] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('quick-play')}
              className="px-3.5 py-1.5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              Quick Play
            </button>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6 pb-20 lg:pb-8">
          <div className="max-w-[1240px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] grid grid-cols-5"
      >
        {[
          { id: 'dashboard' as NavSection, label: 'Home', icon: Home },
          { id: 'quick-play' as NavSection, label: 'Play', icon: Zap },
          { id: 'chess-mystery' as NavSection, label: 'Puzzles', icon: Puzzle },
          { id: 'chess-detective' as NavSection, label: 'Analyze', icon: SearchCheck },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                active
                  ? 'text-[#292720] dark:text-[#F3EBDD] font-semibold'
                  : 'text-[#756F63] dark:text-[#9B9386]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open full navigation menu"
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#756F63] dark:text-[#9B9386]"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#292720]/50 flex justify-end">
          <div className="w-72 max-w-[85vw] h-full bg-[#F3EBDD] dark:bg-[#191714] border-l border-[#D8CDBB] dark:border-[#3B362E] flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#D8CDBB] dark:border-[#3B362E]">
              <span className="font-display font-bold text-sm">All Modules</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-md text-[#756F63]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.group}>
                  <div className="px-2 mb-1 text-[10px] font-semibold tracking-[0.08em] text-[#9B9386]">
                    {group.group}
                  </div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeSection === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm ${
                              active
                                ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-medium'
                                : 'text-[#595347] dark:text-[#B8B0A2]'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
