
import { useState } from "react";
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
    
     <DashboardPage handleLogout={handleLogout} handleShowAdmin={handleShowAdmin} />
     
    </div>
  );
};

export default Index;
