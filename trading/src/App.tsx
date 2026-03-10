import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';

// Lazy-load all pages except the dashboard (initial landing page)
const StrategiesPage = lazy(() => import('./pages/StrategiesPage').then(m => ({ default: m.StrategiesPage })));
const CreateStrategyPage = lazy(() => import('./pages/CreateStrategyPage').then(m => ({ default: m.CreateStrategyPage })));
const StrategyDetailPage = lazy(() => import('./pages/StrategyDetailPage').then(m => ({ default: m.StrategyDetailPage })));
const BacktestsPage = lazy(() => import('./pages/BacktestsPage').then(m => ({ default: m.BacktestsPage })));
const ForwardRunnerPage = lazy(() => import('./pages/ForwardRunnerPage').then(m => ({ default: m.ForwardRunnerPage })));
const ExecutionPage = lazy(() => import('./pages/ExecutionPage').then(m => ({ default: m.ExecutionPage })));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const LedgerPage = lazy(() => import('./pages/LedgerPage').then(m => ({ default: m.LedgerPage })));
const AiPage = lazy(() => import('./pages/AiPage').then(m => ({ default: m.AiPage })));
const ResearchPage = lazy(() => import('./pages/ResearchPage').then(m => ({ default: m.ResearchPage })));
const EvidencePage = lazy(() => import('./pages/EvidencePage').then(m => ({ default: m.EvidencePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const RiskMatrixPage = lazy(() => import('./pages/RiskMatrixPage').then(m => ({ default: m.RiskMatrixPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then(m => ({ default: m.ComparePage })));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })));
const AttributionPage = lazy(() => import('./pages/AttributionPage').then(m => ({ default: m.AttributionPage })));
const GeoSignalsPage = lazy(() => import('./pages/GeoSignalsPage').then(m => ({ default: m.GeoSignalsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
    </div>
  );
}

export function App() {
  return (
    <Shell>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/create" element={<CreateStrategyPage />} />
        <Route path="/strategy/:id" element={<StrategyDetailPage />} />
        <Route path="/backtests" element={<BacktestsPage />} />
        <Route path="/forward" element={<ForwardRunnerPage />} />
        <Route path="/execution" element={<ExecutionPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/risk" element={<RiskMatrixPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/attribution" element={<AttributionPage />} />
        <Route path="/geo-signals" element={<GeoSignalsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </Shell>
  );
}
