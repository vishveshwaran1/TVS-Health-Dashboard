import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Thermometer, User, MapPin, Wifi, LogOut, Settings, Ruler, Weight, Droplets, WifiOff, Power, Download, FileText, UserPlus, Activity, Zap, Wind, Monitor, Phone } from "lucide-react";
import PersonCard from "../components/PersonCard";
import VitalChart from "../components/VitalChart";
import EmployeeEntry from "../components/EmployeeEntry";
import { supabase } from '../lib/supatest';
import LiveTest from "../pages/livetest";


interface WorkEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
  downloadUrl: string;
}
interface Device {
  id: string;
  deviceName: string;
  assignedPerson: string;
  age: number;
  gender: string;
  location: string;
  mac: string;
  status: 'normal' | 'warning' | 'critical';
  heartRate: number;
  temperature: number;
  height: string;
  weight: string;
  bloodGroup: string;
  contactNumber: string;
  respiratoryRate: number;
  photo: string;
  connected: boolean;
  heartRateHistory: Array<{
    time: string;
    value: number;
  }>;
  temperatureHistory: Array<{
    time: string;
    value: number;
  }>;
  respiratoryRateHistory: Array<{
    time: string;
    value: number;
  }>;
  previousWork: WorkEntry[];
}
interface DashboardPageProps {
  onLogout: () => void;
  onShowAdmin: () => void;
}



const DashboardPage = ({
  onLogout,
  onShowAdmin
}: DashboardPageProps) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isEmployeeEntryOpen, setIsEmployeeEntryOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const MAX_HISTORY_POINTS = 10;

  // Auto-select first device on load
  useEffect(() => {
    // Helper to map Supabase row to Device object
    const mapRowToDevice = (row: any): Device => ({
      id: row.id,
      deviceName: row.mac_address || "Unknown Device",
      assignedPerson: "Unknown", // Update if you have a name field
      age: 0, // Default or fetch from another table if available
      gender: "Unknown",
      location: "Unknown",
      mac: row.mac_address || "",
      status: "normal", // You can set logic based on vitals if needed
      heartRate: row.heart_rate ?? 0,
      temperature: row.temperature ?? 0,
      respiratoryRate: row.respiratory_rate ?? 0,
      height: "",
      weight: "",
      bloodGroup: "",
      contactNumber: "",
      photo: "/api/placeholder/150/150",
      connected: true, // Or set logic based on your needs
      heartRateHistory: Array(MAX_HISTORY_POINTS).fill(null).map((_, i) => ({
        time: new Date(Date.now() - (MAX_HISTORY_POINTS - 1 - i) * 1000).toLocaleTimeString(),
        value: row.heart_rate ?? 0
      })),
      temperatureHistory: Array(MAX_HISTORY_POINTS).fill(null).map((_, i) => ({
        time: new Date(Date.now() - (MAX_HISTORY_POINTS - 1 - i) * 1000).toLocaleTimeString(),
        value: row.temperature ?? 0
      })),
      respiratoryRateHistory: Array(MAX_HISTORY_POINTS).fill(null).map((_, i) => ({
        time: new Date(Date.now() - (MAX_HISTORY_POINTS - 1 - i) * 1000).toLocaleTimeString(),
        value: row.respiratory_rate ?? 0
      })),
      previousWork: [],
    });

    interface LiveData {
  id: string;
  value: number;
  
}

const DEVICE_ID = "hr-01";




    const fetchDevices = async () => {
      const { data, error } = await supabase.from("Health Status").select("*");
      console.log("Supabase data:", data, "Error:", error);
      if (!error && data) {
        setDevices(data.map(mapRowToDevice));
      }
    };

    fetchDevices();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:Health Status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Health Status' }, (payload) => {
        console.log('Realtime payload:', payload);
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (devices.length > 0 && (!selectedDevice || !devices.find(d => d.id === selectedDevice.id))) {
      setSelectedDevice(devices[0]);
    }
  }, [devices]);
  const handleConnect = (deviceId: string) => {
    setDevices(prev => prev.map(device => device.id === deviceId ? {
      ...device,
      connected: !device.connected
    } : device));
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice(prev => prev ? {
        ...prev,
        connected: !prev.connected
      } : null);
    }
  };
  const getConnectionStatus = () => {
    const connected = devices.filter(d => d.connected).length;
    const total = devices.length;
    return {
      connected,
      total
    };
  };
  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
    }
  };
  const handleDownload = (workEntry: WorkEntry) => {
    // Simulate download - in real app this would trigger actual file download
    console.log(`Downloading ${workEntry.title} for ${selectedDevice?.assignedPerson}`);
    // window.open(workEntry.downloadUrl, '_blank');
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const getDisplayName = () => {
    if (!selectedDevice) return "";
    return selectedDevice.assignedPerson || selectedDevice.deviceName;
  };
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  useEffect(() => {
    if (!selectedDevice?.connected) return;

    const updateDeviceData = (newData: any) => {
      const currentTime = new Date().toLocaleTimeString();
      
      setSelectedDevice(prev => {
        if (!prev) return null;
        console.log('Updating device data:', newData);
        // Create new history entries
        const newHeartRateHistory = [...prev.heartRateHistory, {
          time: currentTime,
          value: newData.heart_rate || prev.heartRate
        }].slice(-MAX_HISTORY_POINTS);
console.log('New heart rate history:', newHeartRateHistory);
        const newTempHistory = [...prev.temperatureHistory, {
          time: currentTime,
          value: newData.temperature || prev.temperature
        }].slice(-MAX_HISTORY_POINTS);

        const newRespHistory = [...prev.respiratoryRateHistory, {
          time: currentTime,
          value: newData.respiratory_rate || prev.respiratoryRate
        }].slice(-MAX_HISTORY_POINTS);

        return {
          ...prev,
          heartRate: newData.heart_rate || prev.heartRate,
          temperature: newData.temperature || prev.temperature,
          respiratoryRate: newData.respiratory_rate || prev.respiratoryRate,
          heartRateHistory: newHeartRateHistory,
          temperatureHistory: newTempHistory,
          respiratoryRateHistory: newRespHistory
        };
      });
    };

    // Set up Supabase subscription
    const channel = supabase
      .channel('health-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Health Status',
          filter: `mac_address=eq.${selectedDevice.mac}`
        },
        payload => updateDeviceData(payload.new)
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice?.connected, selectedDevice?.mac]);

  // Add this useEffect after your existing effects
  useEffect(() => {
    if (!selectedDevice?.connected) return;

    const channel = supabase
      .channel('realtime-vitals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Health Status',
          filter: `mac_address=eq.${selectedDevice.mac}`
        },
        (payload) => {
          const newData = payload.new;
          const currentTime = new Date().toLocaleTimeString();

          setSelectedDevice(prev => {
            if (!prev) return null;

            const updateHistory = (history: Array<{ time: string; value: number }>, newValue: number) => {
              const newHistory = [...history];
              newHistory.shift(); // Remove oldest value
              newHistory.push({ time: currentTime, value: newValue });
              return newHistory;
            };

            return {
              ...prev,
              heartRate: newData.heart_rate ?? prev.heartRate,
              temperature: newData.temperature ?? prev.temperature,
              respiratoryRate: newData.respiratory_rate ?? prev.respiratoryRate,
              heartRateHistory: updateHistory(prev.heartRateHistory, newData.heart_rate ?? prev.heartRate),
              temperatureHistory: updateHistory(prev.temperatureHistory, newData.temperature ?? prev.temperature),
              respiratoryRateHistory: updateHistory(prev.respiratoryRateHistory, newData.respiratory_rate ?? prev.respiratoryRate)
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice?.connected, selectedDevice?.mac]);

  // Add this useEffect for debugging
  useEffect(() => {
    if (selectedDevice) {
      console.log('Chart data updated:', {
        heartRate: selectedDevice.heartRate,
        temperature: selectedDevice.temperature,
        respiratoryRate: selectedDevice.respiratoryRate,
        historyLength: {
          heart: selectedDevice.heartRateHistory.length,
          temp: selectedDevice.temperatureHistory.length,
          resp: selectedDevice.respiratoryRateHistory.length
        }
      });
    }
  }, [selectedDevice?.heartRateHistory, selectedDevice?.temperatureHistory, selectedDevice?.respiratoryRateHistory]);

  // Replace the existing useEffect for real-time updates with this:
  useEffect(() => {
    if (!selectedDevice?.connected) return;

    let lastUpdateTime = Date.now();
    const MIN_UPDATE_INTERVAL = 100; // Reduced to 100ms for smoother updates

    const handleRealtimeUpdate = (payload: any) => {
      const currentTime = Date.now();
      if (currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL) return;
      lastUpdateTime = currentTime;

      const newData = payload.new;
      const timeString = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Enhanced data validation and parsing
      const parseValue = (value: any, fallback: number) => {
        const parsed = Number(value);
        return !isNaN(parsed) ? Number(parsed.toFixed(1)) : fallback;
      };

      setSelectedDevice(prev => {
        if (!prev) return null;

        const newHeartRate = parseValue(newData.heart_rate, prev.heartRate);
        const newTemperature = parseValue(newData.temperature, prev.temperature);
        const newRespiratoryRate = parseValue(newData.respiratory_rate, prev.respiratoryRate);

        // Enhanced history update with interpolation
        const updateHistory = (history: Array<{time: string; value: number}>, newValue: number) => {
          const newHistory = [...history];
          if (newHistory.length >= MAX_HISTORY_POINTS) {
            newHistory.shift();
          }

          // Add slight random variation for more natural visualization
          const variation = (Math.random() - 0.5) * 0.2;
          const smoothedValue = Number((newValue + variation).toFixed(1));

          newHistory.push({
            time: timeString,
            value: smoothedValue
          });

          return newHistory;
        };

        // Update status based on new values
        const newStatus = determineDeviceStatus(newHeartRate, newTemperature, newRespiratoryRate);

        return {
          ...prev,
          heartRate: newHeartRate,
          temperature: newTemperature,
          respiratoryRate: newRespiratoryRate,
          heartRateHistory: updateHistory(prev.heartRateHistory, newHeartRate),
          temperatureHistory: updateHistory(prev.temperatureHistory, newTemperature),
          respiratoryRateHistory: updateHistory(prev.respiratoryRateHistory, newRespiratoryRate),
          status: newStatus
        };
      });
    };

    // Enhanced Supabase subscription
    const channel = supabase
      .channel(`device-updates-${selectedDevice.mac}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Health Status',
          filter: `mac_address=eq.${selectedDevice.mac}`
        },
        (payload) => {
          try {
            handleRealtimeUpdate(payload);
          } catch (error) {
            console.error('Error processing update:', error);
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice?.connected, selectedDevice?.mac]);

  // Add this helper function
  const determineDeviceStatus = (heartRate: number, temperature: number, respiratoryRate: number): 'normal' | 'warning' | 'critical' => {
  if (heartRate < 60 || heartRate > 100) return 'critical';
  if (temperature < 97 || temperature > 99) return 'critical';
  if (respiratoryRate < 12 || respiratoryRate > 20) return 'critical';
  
  if (heartRate < 65 || heartRate > 95) return 'warning';
  if (temperature < 97.5 || temperature > 98.5) return 'warning';
  if (respiratoryRate < 14 || respiratoryRate > 18) return 'warning';
  
  return 'normal';
};

  return <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-2 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-6 space-y-3 lg:space-y-0 animate-fade-in">
        <div className="flex flex-col space-y-2">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
            Cold Chamber Monitoring Device
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <p className="text-gray-600 text-xs font-medium">{getCurrentDate()}</p>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">System Online</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          {/* Employee Entry Dialog */}
          <Dialog open={isEmployeeEntryOpen} onOpenChange={setIsEmployeeEntryOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="text-gray-700 hover:text-gray-900 hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-all duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto text-xs px-2 py-1"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Employee Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <EmployeeEntry 
                onBack={() => setIsEmployeeEntryOpen(false)}
                onAddEmployee={(employee) => {
                  console.log('Employee added:', employee);
                  setIsEmployeeEntryOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={onLogout} 
            variant="outline" 
            className="text-gray-700 hover:text-red-600 hover:bg-red-50 border-gray-300 hover:border-red-300 transition-all duration-300 ease-in-out transform hover:scale-105 w-full sm:w-auto text-xs px-2 py-1"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 h-[calc(100vh-8rem)]">
        {/* Left Sidebar - Device Profile */}
        <div className="px-2 xl:col-span-1 flex flex-col space-y-3 mb-4 xl:mb-0 h-full">
          <Card className="bg-white rounded-3xl shadow-lg border-0 flex-1 transform transition-all duration-300 hover:shadow-xl p-2">
              <CardContent className="p-2 m-auto">
                              {/* Device Selection Dropdown */}
                <div className="mb-3 text-center">
                <Select value={selectedDevice?.id || ""} onValueChange={handleDeviceSelect}>
                  <SelectTrigger className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300 rounded-xl">
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-xl z-50 rounded-xl">
                    {devices.map(device => (
                      <SelectItem key={device.id} value={device.id} className="cursor-pointer hover:bg-blue-50 transition-colors duration-200">
                                                  <div className="flex items-center space-x-2 w-full">
                            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                              <Monitor className="w-3 h-3 text-blue-600" />
                            </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between space-x-1">
                              <span className="font-medium text-gray-900 text-s">{device.deviceName}</span>
                              <div className="flex items-center space-x-2">
                                <Badge className={`text-[8px] px-1 py-0.5 ${device.status === 'normal' ? 'bg-green-100 text-green-800' : device.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {device.status}
                                </Badge>
                                <div className={`w-2 h-2 rounded-full ${device.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDevice ? (
                <div className="text-center h-full flex flex-col justify-between animate-fade-in">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
                      <Monitor className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 mb-1">{selectedDevice.deviceName}</h3>
                    <p className="text-gray-600 text-[10px] mb-1">Assigned to: {selectedDevice.assignedPerson}</p>
                    <p className="text-gray-500 text-[10px] mb-1">MAC: {selectedDevice.mac}</p>
                    
                    {/* Connection Status */}
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${selectedDevice.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <span className={`text-[10px] font-medium ${selectedDevice.connected ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedDevice.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-2">
                      <Badge className={`text-[10px] px-2 py-0.5 ${selectedDevice.status === 'normal' ? 'bg-green-100 text-green-800' : selectedDevice.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        Status: {selectedDevice.status.charAt(0).toUpperCase() + selectedDevice.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Connect Button */}
                  <Button 
                    onClick={() => handleConnect(selectedDevice.id)} 
                    className={`w-full py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 text-xs ${
                      selectedDevice.connected 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    } text-white shadow-lg hover:shadow-xl`}
                  >
                    {selectedDevice.connected ? (
                      <>
                        <WifiOff className="w-3 h-3 mr-1" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3 h-3 mr-1" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 animate-fade-in">
                  <Monitor className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-500 font-medium text-xs">Select a device</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card className="bg-white rounded-3xl shadow-lg border-0 flex-1 transform transition-all duration-300 hover:shadow-xl">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-gray-900 text-[16px] font-semibold">Employee Details</CardTitle>
            </CardHeader>
                          <CardContent className="p-3 pt-0">
                <div className="space-y-2 animate-fade-in">
                  {/* Employee Selection Dropdown */}
                  <div className="mb-2">
                  <Select value={selectedDevice?.id || ""} onValueChange={handleDeviceSelect}>
                    <SelectTrigger className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300 rounded-lg text-[8px] h-6">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-xl z-50 rounded-xl">
                      {devices.map(device => (
                        <SelectItem key={device.id} value={device.id} className="cursor-pointer hover:bg-blue-50 transition-colors duration-200">
                          <div className="flex items-center space-x-2">
                            <User className="w-3 h-3 text-blue-600" />
                            <span className="text-[11px] font-medium text-gray-900">{device.assignedPerson}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                                  {/* Employee Information - Only show if employee is selected */}
                  {selectedDevice && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-blue-50 rounded-md border border-gray-100 hover:border-blue-200 transition-all duration-300">
                        <User className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Name</p>
                          <p className="text-[12px] font-semibold text-gray-900 truncate">{selectedDevice.assignedPerson}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-green-50 rounded-md border border-gray-100 hover:border-green-200 transition-all duration-300">
                          <Ruler className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Height</p>
                            <p className="text-xs font-semibold text-gray-900">{selectedDevice.height}</p>
                        </div>
                      </div>
                         <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-purple-50 rounded-md border border-gray-100 hover:border-purple-200 transition-all duration-300">
                          <Weight className="w-3 h-3 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Weight</p>
                            <p className="text-xs font-semibold text-gray-900">{selectedDevice.weight}</p>
                        </div>
                      </div>
                    </div>
                      <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-red-50 rounded-md border border-gray-100 hover:border-red-200 transition-all duration-300">
                        <Droplets className="w-3 h-3 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Blood Group</p>
                          <p className="text-xs font-semibold text-gray-900">{selectedDevice.bloodGroup}</p>
                      </div>
                    </div>
                      <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-orange-50 rounded-md border border-gray-100 hover:border-orange-200 transition-all duration-300">
                        <Phone className="w-3 h-3 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Contact</p>
                          <p className="text-xs font-semibold text-gray-900">{selectedDevice.contactNumber}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 h-full">
          {selectedDevice ? (
            <div className="space-y-2 h-full animate-fade-in overflow-y-auto">
              {/* Status Cards */}
              
                <LiveTest />
               
             

              {/* Activity Growth Chart */}
              <Card className="bg-white py-4 px-2 shadow-lg border-0 flex-1 transform transition-all duration-300 hover:shadow-xl">
                <CardHeader className="pb-2 px-3 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                    <CardTitle className="text-gray-900 text-sm font-bold">Live Monitoring - {selectedDevice.deviceName}</CardTitle>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${selectedDevice.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-gray-600 font-medium">
                        {selectedDevice.connected ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {selectedDevice.connected ? (
                    <div className="h-48 min-h-[200px]">
                      <VitalChart 
                        key={`vital-chart-${selectedDevice.id}-${Date.now()}`}
                        title="Vital Signs" 
                        subtitle="Real-time monitoring" 
                        heartRateData={selectedDevice.heartRateHistory.map(h => ({
                          time: h.time,
                          value: Number(h.value)
                        }))} 
                        temperatureData={selectedDevice.temperatureHistory.map(h => ({
                          time: h.time,
                          value: Number(h.value)
                        }))} 
                        respiratoryRateData={selectedDevice.respiratoryRateHistory.map(h => ({
                          time: h.time,
                          value: Number(h.value)
                        }))} 
                        heartRateLatest={`${selectedDevice.heartRate.toFixed(1)} bpm`} 
                        temperatureLatest={`${selectedDevice.temperature.toFixed(1)}°F`} 
                        respiratoryRateLatest={`${selectedDevice.respiratoryRate.toFixed(1)} bpm`} 
                        bloodPressureLatest="120/80 mmHg"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-44 text-gray-500">
                      <div className="text-center">
                        <WifiOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Device Disconnected</p>
                        <p className="text-xs text-gray-400">Connect to view live data</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Previous Work Section */}
              {selectedDevice && (
                <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
                                  <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-gray-900 text-sm font-bold">Device Work History - {selectedDevice.deviceName}</CardTitle>
                  <p className="text-xs text-gray-600">{getCurrentDate()}</p>
                </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      {selectedDevice.previousWork.map(work => (
                        <div key={work.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-300 transform hover:scale-[1.02]">
                          <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-xs">{work.title}</p>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-0.5 sm:space-y-0 sm:space-x-1 mt-0.5">
                                  <span className="text-[8px] text-gray-500">{formatDate(work.date)}</span>
                                  <span className="hidden sm:inline text-[8px] text-gray-400">•</span>
                                  <Badge variant="outline" className="text-[8px] px-1 py-0.5 w-fit">
                                    {work.type}
                                  </Badge>
                                  <span className="hidden sm:inline text-[8px] text-gray-400">•</span>
                                  <span className="text-[8px] text-blue-600">Assigned: {selectedDevice.assignedPerson}</span>
                                </div>
                              </div>
                          </div>
                          <Button 
                            onClick={() => handleDownload(work)} 
                            size="sm" 
                            variant="outline" 
                            className="shrink-0 bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-300 transition-all duration-300 transform hover:scale-105 text-[8px] px-2 py-1"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {selectedDevice.previousWork.length === 0 && (
                        <div className="text-center py-6 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No work history found for device {selectedDevice.deviceName}</p>
                          <p className="text-xs text-gray-400">Device: {selectedDevice.deviceName}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-white rounded-3xl shadow-lg border-0 h-full flex items-center justify-center transform transition-all duration-300 hover:shadow-xl">
              <CardContent>
                <div className="text-center text-gray-500 animate-fade-in">
                  <Monitor className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-bold">Select a Device</p>
                  <p className="text-sm text-gray-400">Choose a device to view health monitoring status</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>;
};
export default DashboardPage;