import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, HeartPulse, Thermometer, User, MapPin, Wifi, LogOut, Settings, Ruler, Weight, Droplets, WifiOff, Power, Download, FileText, UserPlus, Activity, Zap, Wind, Monitor, Phone, Hourglass } from "lucide-react";
import PersonCard from "../components/PersonCard";
import VitalChart from "../components/VitalChart";
import EmployeeEntry from "../components/EmployeeEntry";
import { supabase } from '../lib/supatest';
import LiveTest from "../pages/livetest";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";


interface Device {
  id: string;
  deviceName: string;
  assignedPerson: string;
  mac: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  bloodPressure: number;
  connected: boolean;
  lastActivity: Date;
  heartRateHistory: Array<{ time: string; value: number }>;
  temperatureHistory: Array<{ time: string; value: number }>;
  respiratoryRateHistory: Array<{ time: string; value: number }>;
  bloodPressureHistory: Array<{ time: string; value: number }>;
  updated_at_raw: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  contactNumber?: string;
}

interface Employee {
  id: string;
  name: string;
  age: string;
  gender: string;
  location: string;
  bloodGroup: string;
  contactNumber: string;
}

interface DashboardPageProps {
  onLogout: () => void;
  onShowAdmin: () => void;
}

interface HealthAlert {
  id: string;
  type: 'heart_rate' | 'temperature' | 'respiratory_rate' | 'blood_pressure';
  message: string;
  value: number;
  time: Date;
  severity: 'warning' | 'critical';
}

const VITAL_THRESHOLDS = {
  heart_rate: {
    critical: { min: 60, max: 140 },
    warning: { min: 65, max: 135 }
  },
  temperature: {
    critical: { min: 35.5, max: 38 },
    warning: { min: 36, max: 37.5 }
  },
  respiratory_rate: {
    critical: { min: 12, max: 20 },
    warning: { min: 14, max: 18 }
  },
  blood_pressure: {
    critical: { min: 120, max: 130 },
    warning: { min: 122, max: 128 }
  }
};

const ALERT_COOLDOWN_MS = 60000; // 1-minute cooldown
const CRITICAL_THRESHOLD = 5; // Number of consecutive readings

const DashboardPage = ({ onLogout, onShowAdmin }: DashboardPageProps) => {
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isEmployeeEntryOpen, setIsEmployeeEntryOpen] = useState(false);

  // Update the addAlert function to be memoized
  const addAlert = useCallback((
    type: HealthAlert['type'],
    value: number,
    severity: HealthAlert['severity']
  ) => {
    const now = Date.now();
    
    // Check cooldown
    if (lastAlertTimeRef.current[type] && 
        (now - lastAlertTimeRef.current[type]) < ALERT_COOLDOWN_MS) {
      return;
    }

    const formattedValue = formatVitalValue(type, value);
    const message = `${type.replace(/_/g, ' ')} is ${severity}: ${formattedValue}`;

    const newAlert: HealthAlert = {
      id: crypto.randomUUID(),
      type,
      message,
      value,
      time: new Date(),
      severity
    };

    setHealthAlerts(prev => [newAlert, ...prev.slice(0, 5)]);
    lastAlertTimeRef.current[type] = now;

    // Show toast notification
    toast({
      title: severity === 'critical' ? "⚠️ Critical Alert" : "⚡ Warning",
      description: message,
      variant: severity === 'critical' ? "destructive" : "default",
      duration: severity === 'critical' ? 10000 : 5000,
      className: `${
        severity === 'critical' 
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-yellow-50 border-yellow-200 text-yellow-900'
      } shadow-lg animate-in fade-in duration-300`
    });
  }, [toast]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeInCard, setSelectedEmployeeInCard] = useState<Employee | null>(null);
  const employeeMap = new Map<string, { name: string }>();
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [currentSessionDuration, setCurrentSessionDuration] = useState<number>(0);
  const lastDataActivityTimeRef = useRef<number | null>(null);
  const durationIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const dataTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const deviceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map()).current;
  const MAX_HISTORY_POINTS = 10;
  const DATA_INACTIVITY_THRESHOLD_MS = 15000;
  const DEVICE_OFFLINE_THRESHOLD = 15000; // 15 seconds

  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);

  const criticalCounters = useRef({
    heart_rate: 0,
    temperature: 0,
    respiratory_rate: 0,
    blood_pressure: 0
  });

  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const ALERT_COOLDOWN_MS = 60000; // 1-minute cooldown

  // Add this new useEffect for health monitoring
useEffect(() => {
  if (!selectedDevice?.connected) return;

  const checkVitals = () => {
    const now = Date.now();
    const addAlert = (type: string, value: number, message: string) => {
      if (now - (lastAlertTimeRef.current[type] || 0) > ALERT_COOLDOWN_MS) {
        // Add to alerts history
        setHealthAlerts(prev => [{
          id: crypto.randomUUID(),
          type: type as any,
          message,
          time: new Date(),
          value,
          severity: 'critical'
        }, ...prev.slice(0, 5)]);
        
        // Show toast notification
        toast({
          title: "Health Alert",
          description: message,
          variant: "destructive",
          duration: 5000, // Will dismiss after 5 seconds
          className: "bg-red-50 border-red-200",
        });

        lastAlertTimeRef.current[type] = now;
      }
    };

    // Check heart rate
    if (selectedDevice.heartRate < 60 || selectedDevice.heartRate > 140) {
      criticalCounters.current.heart_rate++;
      if (criticalCounters.current.heart_rate >= 5) {
        addAlert('heart_rate', selectedDevice.heartRate,
          `Heart rate critical: ${selectedDevice.heartRate} bpm`);
      }
    } else {
      criticalCounters.current.heart_rate = 0;
    }

    // Check temperature
    if (selectedDevice.temperature < 35.5 || selectedDevice.temperature > 38) {
      criticalCounters.current.temperature++;
      if (criticalCounters.current.temperature >= 5) {
        addAlert('temperature', selectedDevice.temperature,
          `Temperature critical: ${selectedDevice.temperature}°C`);
      }
    } else {
      criticalCounters.current.temperature = 0;
    }

    // Check respiratory rate
    if (selectedDevice.respiratoryRate < 7 || selectedDevice.respiratoryRate > 9) {
      criticalCounters.current.respiratory_rate++;
      if (criticalCounters.current.respiratory_rate >= 5) {
        addAlert('respiratory_rate', selectedDevice.respiratoryRate,
          `Respiratory rate critical: ${selectedDevice.respiratoryRate} rpm`);
      }
    } else {
      criticalCounters.current.respiratory_rate = 0;
    }
  };

  const interval = setInterval(checkVitals, 5000);
  return () => clearInterval(interval);
}, [selectedDevice?.connected, selectedDevice?.heartRate, 
    selectedDevice?.temperature, selectedDevice?.respiratoryRate, toast]);

  // Auto-select first device on load
  useEffect(() => {
    // Helper to map Supabase row to Device object
    const mapRowToDevice = (row: any): Device => ({
      id: row.id,
      deviceName: row.mac_address || "Unknown Device",
      assignedPerson: "Unknown",
      mac: row.mac_address || "",
      heartRate: row.heart_rate ?? 0,
      temperature: row.temperature ?? 0,
      respiratoryRate: row.respiratory_rate ?? 0,
      bloodPressure: parseSystolicBP(row.blood_pressure),
      connected: true,
      lastActivity: new Date(row.updated_at),
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
            const employee = employeeMap.get(mac);
            const lastUpdateTime = new Date(row.updated_at).getTime();
            const isConnected = (Date.now() - lastUpdateTime) < DEVICE_OFFLINE_THRESHOLD;
            
            if (!uniqueDevicesMap.has(mac) || 
                new Date(row.updated_at) > new Date(uniqueDevicesMap.get(mac)!.updated_at_raw)) {
              uniqueDevicesMap.set(mac, {
                id: row.id,
                deviceName: `Device ${mac}`,
                assignedPerson: employee ? employee.name : "Unassigned",
                mac: mac,
                heartRate: row.heart_rate ?? 0,
                temperature: row.temperature ?? 0,
                respiratoryRate: row.respiratory_rate ?? 0,
                bloodPressure: parseSystolicBP(row.blood_pressure),
                connected: isConnected,
                lastActivity: new Date(row.updated_at),
                heartRateHistory: [], // Initialize histories
                temperatureHistory: [],
                respiratoryRateHistory: [],
                bloodPressureHistory: [],
                updated_at_raw: row.updated_at
              });

              // Set timeout for connection status
              if (isConnected) {
                if (deviceTimeouts.has(mac)) {
                  clearTimeout(deviceTimeouts.get(mac)!);
                }
                deviceTimeouts.set(mac, setTimeout(() => {
                  setDevices(prev => prev.map(d => 
                    d.mac === mac ? { ...d, connected: false } : d
                  ));
                }, DEVICE_OFFLINE_THRESHOLD));
              }
            }
          }
        });

        setDevices(Array.from(uniqueDevicesMap.values()));
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
    setDevices(prev => prev.map((device) => device.id === deviceId ? {
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

  // Add this for debugging
  useEffect(() => {
    if (selectedDevice) {
      console.log('Selected device updated:', selectedDevice);
    }
  }, [selectedDevice]);

  // Add this for debugging
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

  const renderEmployeeDetails = () => {
    if (!selectedDevice) return null;

    return (
      <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-1 px-2 pt-2">
          <CardTitle className="text-gray-900 text-sm font-bold">Employee Details</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {selectedDevice.assignedPerson === "Unassigned" ? (
            <div className="text-center py-2">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-xs text-gray-500">No employee assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium">{selectedDevice.assignedPerson}</span>
              </div>
              {selectedDevice.age && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">Age: {selectedDevice.age} years</span>
                </div>
              )}
              {selectedDevice.gender && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">Gender: {selectedDevice.gender}</span>
                </div>
              )}
              {selectedDevice.bloodGroup && (
                <div className="flex items-center space-x-2">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">Blood Group: {selectedDevice.bloodGroup}</span>
                </div>
              )}
              {selectedDevice.contactNumber && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">Contact: {selectedDevice.contactNumber}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
  <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
    {/* Header - Fixed height */}
    <div className="flex-shrink-0 px-4 py-2">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-6 space-y-3 lg:space-y-0">
        <div className="flex flex-col space-y-2">
           
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
            <img 
    src="/Delphi_logo.png" 
    alt="Delphi TVS Logo" 
    className="h-10 w-auto" 
  />
            Cold Chamber Monitoring Device
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <p className="text-gray-600 text-xs font-medium">{getCurrentDate()}</p>
            <div className="flex items-center space-x-2">
              
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
                onAddEmployee={async (employeeData) => {
                  const newEmployee = {
                    id: crypto.randomUUID(),
                    ...employeeData
                  };
                  
                  setAllEmployees(prev => [...prev, newEmployee]);
                  setSelectedEmployeeInCard(newEmployee);
                  setIsEmployeeEntryOpen(false);

                  // Update selected device with employee info
                  setSelectedDevice(prevDevice => {
                    if (!prevDevice) return null;
                    return {
                      ...prevDevice,
                      assignedPerson: newEmployee.name,
                      age: Number(newEmployee.age),
                      gender: newEmployee.gender,
                      bloodGroup: newEmployee.bloodGroup,
                      contactNumber: newEmployee.contactNumber,
                    };
                  });
                }}
                supabaseClient={supabase}
              />
            </DialogContent>
          </Dialog>
          
          
        </div>
      </div>
    </div>

      {/* Main Content Grid */}
    <div className="flex-grow grid grid-cols-1 xl:grid-cols-4 gap-3 px-4 min-h-0">
      {/* Left Sidebar */}
      <div className="xl:col-span-1 flex flex-col space-y-2 overflow-y-auto">
        {/* Device Profile Card */}
        <Card className="flex-shrink-0 bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
  <CardContent className="p-2 m-auto">
    {/* Device Selection Dropdown */}
    <div className="mb-3 text-center">
      <Select value={selectedDevice?.id || ""} onValueChange={handleDeviceSelect}>
        <SelectTrigger className="w-full bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300 rounded-xl">
          <SelectValue placeholder="Select a device" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-xl z-50 rounded-xl">
          {devices.map(device => (
            <SelectItem 
              key={device.id} 
              value={device.id} 
              className="cursor-pointer hover:bg-blue-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-2 w-full">
                <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <Monitor className="w-3 h-3 text-blue-600" />
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-gray-900 text-s">{device.deviceName}</span>
                  <div className={`w-2 h-2 rounded-full ${device.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {selectedDevice ? (
      <div className="text-center animate-fade-in">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-2 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
            <Monitor className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">{selectedDevice.deviceName}</h3>
          <p className="text-gray-600 text-[10px] mb-1">
            {selectedDevice.assignedPerson !== "Unassigned" 
              ? `Assigned to: ${selectedDevice.assignedPerson}`
              : "No employee assigned"}
          </p>
          <p className="text-gray-500 text-[10px] mb-2">MAC: {selectedDevice.mac}</p>
          
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${selectedDevice.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-[10px] font-medium text-gray-600">
             
            </span>
          </div>
        </div>
      </div>
    ) : (
      <div className="text-center py-6 animate-fade-in">
        <Monitor className="w-16 h-16 mx-auto mb-3 opacity-50" />
        <p className="text-gray-500 font-medium text-xs">Select a device</p>
      </div>
    )}
  </CardContent>
</Card>

        {/* Employee Details Card */}
        <Card className="flex-shrink-0 bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
  <CardHeader className="pb-2 px-3 pt-3">
    <CardTitle className="text-gray-900 text-[16px] font-semibold">Employee Details</CardTitle>
  </CardHeader>
  <CardContent className="p-3 pt-0">
    <div className="space-y-2 animate-fade-in">
      {/* Employee Selection Dropdown */}
      <Select
        value={selectedEmployeeInCard?.id || ""}
        onValueChange={(id) => {
          const selected = allEmployees.find(emp => emp.id === id);
          setSelectedEmployeeInCard(selected || null);
        }}
      >
        <SelectTrigger className="w-full h-8 bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors duration-300 rounded-xl text-xs">
          <SelectValue placeholder="Select an employee" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-xl z-50 rounded-xl">
          {allEmployees.map(employee => (
            <SelectItem 
              key={employee.id} 
              value={employee.id} 
              className="cursor-pointer hover:bg-blue-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-2 w-full">
                <User className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">{employee.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Display Employee Details */}
      {selectedEmployeeInCard ? (
        <div className="space-y-1 mt-2">
          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-blue-50 rounded-md border border-gray-100">
            <User className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Name</p>
              <p className="text-[12px] font-semibold text-gray-900 truncate">
                {selectedEmployeeInCard.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-green-50 rounded-md border border-gray-100">
              <User className="w-3 h-3 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Age</p>
                <p className="text-xs font-semibold text-gray-900">
                  {selectedEmployeeInCard.age}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-purple-50 rounded-md border border-gray-100">
              <User className="w-3 h-3 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Gender</p>
                <p className="text-xs font-semibold text-gray-900">
                  {selectedEmployeeInCard.gender}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-cyan-50 rounded-md border border-gray-100">
            <MapPin className="w-3 h-3 text-cyan-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Location</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedEmployeeInCard.location}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-red-50 rounded-md border border-gray-100">
            <Droplets className="w-3 h-3 text-red-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Blood Group</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedEmployeeInCard.bloodGroup}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 p-1 bg-gradient-to-r from-gray-50 to-orange-50 rounded-md border border-gray-100">
            <Phone className="w-3 h-3 text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[8px] text-gray-500 mb-0.5 font-medium">Contact</p>
              <p className="text-xs font-semibold text-gray-900">
                {selectedEmployeeInCard.contactNumber}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-xs text-gray-500">No employee selected</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>

{/* Health Alerts History Card */}
<Card className="flex-grow bg-white rounded-3xl shadow-lg border-0">
  <CardHeader className="pb-2 px-3 pt-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Heart className="w-4 h-4 text-red-500" />
        <CardTitle className="text-gray-900 text-[16px] font-semibold">
          Health Alerts
        </CardTitle>
      </div>
      {healthAlerts.length > 0 && (
        <Badge 
          variant="destructive" 
          className="animate-pulse"
        >
          {healthAlerts.length}
        </Badge>
      )}
    </div>
  </CardHeader>
  <CardContent className="p-3 overflow-y-auto max-h-[calc(100vh-24rem)]">
    <div className="space-y-2">
      {healthAlerts.length > 0 ? (
        healthAlerts.map(alert => (
          <div
            key={alert.id}
            className={`p-2 rounded-lg border transition-all duration-300 hover:shadow-md ${
              alert.severity === 'critical'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-900">
                  {alert.message}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {alert.time.toLocaleTimeString()}
                </p>
              </div>
              {alert.type === 'heart_rate' && (
                <HeartPulse className={`w-4 h-4 ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`} />
              )}
              {alert.type === 'temperature' && (
                <Thermometer className={`w-4 h-4 ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`} />
              )}
              {alert.type === 'respiratory_rate' && (
                <Activity className={`w-4 h-4 ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                }`} />
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6">
          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-xs text-gray-500">No alerts</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>

{/* Device Work Session Card - moved from main content */}
          
  
  </div>

        {/* Main Content */}
      <div className="xl:col-span-3 flex flex-col min-h-0 overflow-hidden">
        {selectedDevice ? (
          <div className="flex flex-col h-full space-y-2">
            {/* LiveTest Component - Fixed height */}
            <div className="flex-shrink-0">
              <LiveTest />
            </div>

            {/* Chart Card - Fills remaining space */}
            <Card className="flex-grow bg-white rounded-xl shadow-lg overflow-hidden">
              <CardHeader className="flex-shrink-0 pb-2">
                <CardTitle className="text-lg font-semibold">Live Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)] p-0"> {/* Adjust height based on header */}
                <VitalChart
                  title="Vital Signs"
                  subtitle=""
                  
                  deviceId={selectedDevice.mac}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Select a device to view details</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  </div>
);
};



// Helper function to parse blood pressure (add near other helper functions)
const parseSystolicBP = (bpValue: string | number | null): number => {
  if (bpValue === null) return 120; // Default value
  if (typeof bpValue === 'number') return bpValue;
  const parts = bpValue.split('/')[0];
  const parsed = parseFloat(parts);
  return isNaN(parsed) ? 120 : parsed;
};

// Add these helper functions after your constants
const checkVitalStatus = (
  type: keyof typeof VITAL_THRESHOLDS,
  value: number
): 'normal' | 'warning' | 'critical' => {
  const threshold = VITAL_THRESHOLDS[type];
  
  if (value < threshold.critical.min || value > threshold.critical.max) {
    return 'critical';
  }
  if (value < threshold.warning.min || value > threshold.warning.max) {
    return 'warning';
  }
  return 'normal';
};

const formatVitalValue = (type: string, value: number): string => {
  switch (type) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'heart_rate':
      return `${value} bpm`;
    case 'respiratory_rate':
      return `${value} rpm`;
    case 'blood_pressure':
      return `${value} mmHg`;
    default:
      return `${value}`;
  }
};

export default DashboardPage;