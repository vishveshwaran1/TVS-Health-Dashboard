import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Thermometer, User, MapPin, Wifi, LogOut, Settings, Ruler, Weight, Droplets, WifiOff, Power, Download, FileText, UserPlus, Activity, Zap, Wind, Monitor, Phone, Hourglass } from "lucide-react";
import PersonCard from "../components/PersonCard";
import VitalChart from "../components/VitalChart";
import EmployeeEntry from "../components/EmployeeEntry";
import { supabase } from '../lib/supatest';
import LiveTest from "../pages/livetest";


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
  respiratoryRate: number;
  bloodPressure: number;
  bloodGroup: string;
  contactNumber: string;
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
  bloodPressureHistory: Array<{
    time: string;
    value: number;
  }>;
  updated_at_raw: string;
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
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [currentSessionDuration, setCurrentSessionDuration] = useState<number>(0);
  const lastDataActivityTimeRef = useRef<number | null>(null);
  const durationIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const dataTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_HISTORY_POINTS = 10;
  const DATA_INACTIVITY_THRESHOLD_MS = 15000;

  // Auto-select first device on load
  useEffect(() => {
    // Helper to map Supabase row to Device object
    const mapRowToDevice = (row: any): Device => ({
      id: row.id,
      deviceName: row.mac_address || "Unknown Device",
      assignedPerson: "Unknown",
      age: 0,
      gender: "Unknown",
      location: "Unknown",
      mac: row.mac_address || "",
      status: determineDeviceStatus(row.heart_rate ?? 0, row.temperature ?? 0, row.respiratory_rate ?? 0),
      heartRate: row.heart_rate ?? 0,
      temperature: row.temperature ?? 0,
      respiratoryRate: row.respiratory_rate ?? 0,
      bloodPressure: parseSystolicBP(row.blood_pressure),
      bloodGroup: "",
      contactNumber: "",
      photo: "/api/placeholder/150/150",
      connected: true,
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
      bloodPressureHistory: Array(MAX_HISTORY_POINTS).fill(null).map((_, i) => ({
        time: new Date(Date.now() - (MAX_HISTORY_POINTS - 1 - i) * 1000).toLocaleTimeString(),
        value: parseSystolicBP(row.blood_pressure)
      })),
      updated_at_raw: row.updated_at,
    });

    interface LiveData {
  id: string;
  value: number;
  
}

const DEVICE_ID = "hr-01";




    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from("Health Status")
        .select("*")
        .order("updated_at", { ascending: false });

      console.log("Supabase data:", data, "Error:", error);
      
      if (!error && data) {
        const uniqueDevicesMap = new Map<string, Device>();

        data.forEach(row => {
          const mac = row.mac_address;
          if (mac) {
            if (!uniqueDevicesMap.has(mac) || 
                new Date(row.updated_at) > new Date(uniqueDevicesMap.get(mac)!.updated_at_raw)) {
              uniqueDevicesMap.set(mac, mapRowToDevice(row));
            }
          }
        });

        const uniqueDevices = Array.from(uniqueDevicesMap.values());
        console.log("Unique devices:", uniqueDevices);
        setDevices(uniqueDevices);
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

        const newBloodPressureHistory = [...prev.bloodPressureHistory, {
          time: currentTime,
          value: newData.blood_pressure || prev.bloodPressure
        }].slice(-MAX_HISTORY_POINTS);

        return {
          ...prev,
          heartRate: newData.heart_rate || prev.heartRate,
          temperature: newData.temperature || prev.temperature,
          respiratoryRate: newData.respiratory_rate || prev.respiratoryRate,
          bloodPressure: newData.blood_pressure || prev.bloodPressure,
          heartRateHistory: newHeartRateHistory,
          temperatureHistory: newTempHistory,
          respiratoryRateHistory: newRespHistory,
          bloodPressureHistory: newBloodPressureHistory
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

  // Helper function to update history arrays
  const updateHistory = (history: Array<{ time: string; value: number }>, newValue: number) => {
    const timeString = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const newHistory = [...history.slice(1), { time: timeString, value: newValue }];
    return newHistory;
  };

  // Replace the existing useEffect for real-time updates with this:
  useEffect(() => {
    if (!selectedDevice?.connected) return;

    const handleRealtimeUpdate = (payload: any) => {
      const newData = payload.new;
      const now = new Date();
      const currentTime = now.toLocaleTimeString();

      setSelectedDevice(prev => {
        if (!prev) return null;

        // Update histories
        const updateHistory = (history: Array<{ time: string; value: number }>, newValue: number) => {
          const newHistory = [...history];
          newHistory.shift();
          newHistory.push({ time: currentTime, value: newValue });
          return newHistory;
        };

        const newHeartRateHistory = updateHistory(prev.heartRateHistory, newData.heart_rate ?? prev.heartRate);
        const newTempHistory = updateHistory(prev.temperatureHistory, newData.temperature ?? prev.temperature);
        const newRespHistory = updateHistory(prev.respiratoryRateHistory, newData.respiratory_rate ?? prev.respiratoryRate);
        const newBPHistory = updateHistory(prev.bloodPressureHistory, newData.blood_pressure ?? prev.bloodPressure);

        return {
          ...prev,
          heartRate: newData.heart_rate ?? prev.heartRate,
          temperature: newData.temperature ?? prev.temperature,
          respiratoryRate: newData.respiratory_rate ?? prev.respiratoryRate,
          bloodPressure: newData.blood_pressure ?? prev.bloodPressure,
          heartRateHistory: newHeartRateHistory,
          temperatureHistory: newTempHistory,
          respiratoryRateHistory: newRespHistory,
          bloodPressureHistory: newBPHistory
        };
      });
    };

    // Set up Supabase subscription without debouncing
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice?.connected, selectedDevice?.mac]);

  // Session cleanup effect
useEffect(() => {
  return () => {
    if (durationIntervalIdRef.current) {
      clearInterval(durationIntervalIdRef.current);
      durationIntervalIdRef.current = null;
    }
    if (dataTimeoutIdRef.current) {
      clearTimeout(dataTimeoutIdRef.current);
      dataTimeoutIdRef.current = null;
    }
    setSessionStartTime(null);
    setSessionEndTime(null);
    setCurrentSessionDuration(0);
    lastDataActivityTimeRef.current = null;
  };
}, [selectedDevice?.id]);

// Duration timer effect
useEffect(() => {
  if (sessionStartTime && sessionEndTime === null) {
    if (durationIntervalIdRef.current === null) {
      durationIntervalIdRef.current = setInterval(() => {
        const nowTime = Date.now();
        const currentStartTime = sessionStartTime.getTime();
        setCurrentSessionDuration(Math.floor((nowTime - currentStartTime) / 1000));
      }, 1000);
    }
  } else {
    if (durationIntervalIdRef.current) {
      clearInterval(durationIntervalIdRef.current);
      durationIntervalIdRef.current = null;
    }
  }
}, [sessionStartTime, sessionEndTime]);

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

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
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
                onAddEmployee={(employeeData) => {
                  console.log('Employee added:', employeeData);
                  setIsEmployeeEntryOpen(false);

                  setSelectedDevice(prevDevice => {
                    if (!prevDevice) return null;

                    return {
                      ...prevDevice,
                      assignedPerson: employeeData.name,
                      age: parseInt(employeeData.age),
                      gender: employeeData.gender,
                      bloodGroup: employeeData.bloodGroup,
                      contactNumber: employeeData.contactNumber,
                    };
                  });
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
        {/* Left Sidebar - Device Profile, Employee Details, and Work Session */}
        <div className="px-2 xl:col-span-1 flex flex-col space-y-2 mb-4 xl:mb-0">
          {/* Device Profile Card - remains unchanged */}
          <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl p-1">
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

          {/* Employee Details Card - remains unchanged */}
          <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-gray-900 text-[16px] font-semibold">Employee Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 animate-fade-in">
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
                        <User className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Age</p>
                          <p className="text-xs font-semibold text-gray-900">{selectedDevice.age}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-purple-50 rounded-md border border-gray-100 hover:border-purple-200 transition-all duration-300">
                        <User className="w-3 h-3 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Gender</p>
                          <p className="text-xs font-semibold text-gray-900">{selectedDevice.gender}</p>
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

          {/* Device Work Session Card - moved from main content */}
          {selectedDevice && (
    <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-1 px-2 pt-2">
        <CardTitle className="text-gray-900 text-sm font-bold">
          Work Session Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="space-y-2">
          {/* Start Time and Status */}
          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-md border border-blue-200">
            <Zap className="w-3 h-3 text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Start Time</p>
              <p className="text-[10px] font-semibold text-gray-900">
                {sessionStartTime ? sessionStartTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                }) : "--:--:-- AM/PM"}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <Wind className="w-3 h-3 text-gray-600" />
              <p className="text-[10px] font-semibold text-gray-900">
                {sessionStartTime && sessionEndTime === null ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {/* Duration and End Time */}
          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-red-50 to-red-100 rounded-md border border-red-200">
            <Activity className="w-3 h-3 text-red-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Duration</p>
              <p className="text-[10px] font-semibold text-gray-900">
                {formatDuration(currentSessionDuration)}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              <Hourglass className="w-3 h-3 text-gray-600" />
              <p className="text-[10px] font-semibold text-gray-900">
                {sessionEndTime ? sessionEndTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : "--:--"}
              </p>
            </div>
          </div>

          {/* Status Messages */}
          {!selectedDevice.connected && (
            <p className="text-[10px] text-center text-gray-500 font-medium">
              Device disconnected
            </p>
          )}
          {selectedDevice.connected && !sessionStartTime && !sessionEndTime && (
            <p className="text-[10px] text-center text-gray-500 font-medium">
              Waiting for data...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )}
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 h-full">
          {selectedDevice ? (
            <div className="space-y-2 h-full animate-fade-in overflow-y-auto">
              {/* Status Cards */}
              
                <LiveTest />
               
  {/* Activity Growth Chart */}
  <Card className="bg-white shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
   <CardHeader className="pb-2 px-3 pt-3">
   
  </CardHeader>

 </Card>
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

// Helper function to parse blood pressure (add near other helper functions)
const parseSystolicBP = (bpValue: string | number | null): number => {
  if (bpValue === null) return 120; // Default value
  if (typeof bpValue === 'number') return bpValue;
  const parts = bpValue.split('/')[0];
  const parsed = parseFloat(parts);
  return isNaN(parsed) ? 120 : parsed;
};

export default DashboardPage;