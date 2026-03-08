import { Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { CreateStrategyPage } from './pages/CreateStrategyPage';
import { StrategyDetailPage } from './pages/StrategyDetailPage';
import { BacktestsPage } from './pages/BacktestsPage';
import { ForwardRunnerPage } from './pages/ForwardRunnerPage';
import { ExecutionPage } from './pages/ExecutionPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { LedgerPage } from './pages/LedgerPage';
import { AiPage } from './pages/AiPage';
import { ResearchPage } from './pages/ResearchPage';
import { EvidencePage } from './pages/EvidencePage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <Shell>
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
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
