import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, FileText, ArrowLeft } from "lucide-react";
import EmployeeEntry from "../components/EmployeeEntry";
import EmployeeRecords from "../components/EmployeeRecords";
interface AdminPageProps {
  onBack: () => void;
}
type AdminView = 'main' | 'records';
const AdminPage = ({
  onBack
}: AdminPageProps) => {
  const [currentView, setCurrentView] = useState<AdminView>('main');
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  if (currentView === 'records') {
    return <EmployeeRecords onBack={() => setCurrentView('main')} />;
  }
  return <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black">
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="text-black border-2 border-black hover:bg-gray-100" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Admin Panel</h1>
            <p className="text-gray-600">Manage employees and records</p>
          </div>
        </div>
      </div>

      {/* Admin Options */}
      
    </div>;
};
export default AdminPage;