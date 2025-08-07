
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  Eye, 
  Heart, 
  Thermometer,
  User,
  Calendar,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmployeeEntry from "./EmployeeEntry";
import { supabase } from "@/lib/supabase";

interface EmployeeRecordsProps {
  onBack: () => void;
}

interface Employee {
  id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  status: 'normal' | 'warning' | 'critical';
  photo: string;
  lastReading: string;
  totalReadings: number;
}

const EmployeeRecords = ({ onBack }: EmployeeRecordsProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;
    const fetchEmployees = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('*');
      if (!error) setEmployees(data || []);
      setLoading(false);
    };
    fetchEmployees();

    // Subscribe to realtime changes
    subscription = supabase
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500 hover:bg-green-600';
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleDownloadReport = (employee: Employee) => {
    // Simulate report download
    toast({
      title: "Report Downloaded",
      description: `${employee.name}'s vital signs report has been downloaded.`,
    });
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    toast({
      title: "View Details",
      description: `Opening detailed view for ${employee.name}`,
    });
  };

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-black">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            className="text-black border-2 border-black hover:bg-gray-100"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Employee Records</h1>
            <p className="text-gray-600">View and download employee vital signs records</p>
          </div>
        </div>
        
        {/* Employee Entry Details Button */}
        <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Employee Entry Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-black">
            <DialogHeader>
              <DialogTitle className="text-black text-2xl">Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <EmployeeEntry 
                onBack={() => setIsEntryDialogOpen(false)}
                onAddEmployee={async (employee) => {
                  await supabase.from('employees').insert([employee]);
                  setIsEntryDialogOpen(false);
                }}
                supabaseClient={supabase}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Search Bar */}
        <Card className="bg-white border-2 border-black mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-2 border-gray-300 text-black placeholder-gray-400 focus:border-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p>Loading employees...</p>
          ) : filteredEmployees.length === 0 ? (
            <Card className="bg-white border-2 border-black">
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">No employees found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            filteredEmployees.map((employee) => (
              <Card key={employee.id} className="bg-white border-2 border-black hover:bg-gray-50 transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={employee.photo} />
                        <AvatarFallback className="bg-blue-500 text-white">
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-black font-semibold">{employee.name}</h3>
                        <p className="text-gray-600 text-sm">{employee.id}</p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(employee.status)} text-white`}>
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Last Reading: {employee.lastReading}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span>Total Readings: {employee.totalReadings}</span>
                    </div>
                    <p><strong>Location:</strong> {employee.location}</p>
                    <p><strong>Age:</strong> {employee.age} • <strong>Gender:</strong> {employee.gender}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-black border-2 border-black hover:bg-gray-100"
                      onClick={() => handleViewDetails(employee)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleDownloadReport(employee)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeRecords;
