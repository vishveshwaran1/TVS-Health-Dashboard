
import { useState } from "react";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import AdminPage from "./AdminPage";


type AppView = 'login' | 'dashboard' | 'admin' | 'heartrate';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');

  const handleLogin = () => {
    setCurrentView('dashboard');
  };

 

  const handleLogout = () => {
    setCurrentView('login');
  };

  const handleShowAdmin = () => {
    setCurrentView('admin');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-white">
      {currentView === 'login' && (
        <LoginPage onLogin={handleLogin} />
      )}
      {currentView === 'dashboard' && (
        <DashboardPage 
          onLogout={handleLogout} 
          onShowAdmin={handleShowAdmin}
        />
      )}
      {currentView === 'admin' && (
        <AdminPage onBack={handleBackToDashboard} />
      )}
     
    </div>
  );
};

export default Index;
