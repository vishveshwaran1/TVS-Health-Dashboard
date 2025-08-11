import { useEffect, useState, useCallback } from "react";
import { AlertCircle, User2Icon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../lib/supatest";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Thermometer, Activity, Stethoscope } from "lucide-react";

// Define vital ranges with warning thresholds
const VITAL_RANGES = {
  heartRate: { min: 60, max: 140 },
  temperature: { min: 35.5, max: 38 },
  respiratoryRate: { min: 3, max: 9 },
  bloodPressure: { min: 30, max: 230 }
};

interface VitalStatus {
  count: number;
  lastAlertTime: number;
  isCritical: boolean;
}

const MAC_ADDRESS ="18:8B:0E:91:8B:98"; // Replace with the actual MAC address

export default function VitalsDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState({
    heart_rate: null,
    temperature: null,
    blood_pressure: "--",
    respiratory_rate: null,
  });

  // Use a single state object for tracking vital statuses
  const [vitalStatuses, setVitalStatuses] = useState<Record<string, VitalStatus>>({
    heartRate: { count: 0, lastAlertTime: 0, isCritical: false },
    temperature: { count: 0, lastAlertTime: 0, isCritical: false },
    respiratoryRate: { count: 0, lastAlertTime: 0, isCritical: false },
    bloodPressure: { count: 0, lastAlertTime: 0, isCritical: false }
  });

  // Helper function to check if a vital is critical
  const checkVitalCritical = useCallback((vitalName: string, value: number | null): boolean => {
    if (value === null) return false;
    const range = VITAL_RANGES[vitalName as keyof typeof VITAL_RANGES];
    return value < range.min || value > range.max;
  }, []);

  // Helper function to format vital value and get unit
  const formatVitalValue = useCallback((vitalName: string, value: number) => {
    const unit = vitalName === 'heartRate' ? 'bpm'
      : vitalName === 'temperature' ? '°C'
      : vitalName === 'respiratoryRate' ? 'rpm'
      : 'mmHg';
    
    const formatted = vitalName === 'temperature' ? value.toFixed(1) : value;
    return { formatted, unit };
  }, []);

  // Main function to handle vital sign updates
  const handleVitalUpdate = useCallback((newData: any) => {
    console.log('Handling vital update:', newData);

    if (!newData || typeof newData !== 'object') {
      console.error('Invalid data received:', newData);
      return;
    }

    setData(prevData => {
      const hasChanges = JSON.stringify(prevData) !== JSON.stringify(newData);
      if (hasChanges) {
        console.log('Updating data state:', newData);
        return newData;
      }
      return prevData;
    });

    const now = Date.now();
    const vitalsToCheck = {
      heartRate: newData.heart_rate,
      temperature: newData.temperature,
      respiratoryRate: newData.respiratory_rate,
      bloodPressure: parseInt(newData.blood_pressure?.split('/')[0])
    };

    setVitalStatuses(prevStatuses => {
      const newStatuses = { ...prevStatuses };

      Object.entries(vitalsToCheck).forEach(([vitalName, value]) => {
        const isCritical = checkVitalCritical(vitalName, value);
        const prevStatus = prevStatuses[vitalName];
        const prevValue =
          vitalName === "heartRate" ? data.heart_rate :
          vitalName === "temperature" ? data.temperature :
          vitalName === "respiratoryRate" ? data.respiratory_rate :
          vitalName === "bloodPressure" ? parseInt(data.blood_pressure?.split('/')[0]) : null;

        // Only proceed if the value has changed
        if (value !== prevValue) {
          if (isCritical) {
            const newCount = prevStatus.count + 1;
            const cooldownPassed = now - prevStatus.lastAlertTime > 10000;

            if (newCount >= 5 && cooldownPassed && value !== null) {
              const { formatted, unit } = formatVitalValue(vitalName, value);
              toast({
                title: "⚠️ Critical Alert",
                description: `${vitalName.replace(/([A-Z])/g, ' $1').trim()} is critical: ${formatted} ${unit}`,
                variant: "destructive",
                duration: 5000,
              });

              newStatuses[vitalName] = {
                count: 0,
                lastAlertTime: now,
                isCritical: true
              };
            } else {
              newStatuses[vitalName] = {
                ...prevStatus,
                count: newCount,
                isCritical: true
              };
            }
          } else {
            newStatuses[vitalName] = {
              count: 0,
              lastAlertTime: prevStatus.lastAlertTime,
              isCritical: false
            };
          }
        } else {
          // If value hasn't changed, preserve previous status (prevents repeated alerts)
          newStatuses[vitalName] = { ...prevStatus };
        }
      });

      return newStatuses;
    });
  }, [checkVitalCritical, formatVitalValue, toast, data]);

  // Set up real-time subscription
  useEffect(() => {
    let isSubscribed = true;
    
    // Function to fetch latest data
    const fetchLatestData = async () => {
      try {
        const { data: latestData, error } = await supabase
          .from("Health Status")
          .select("*")
          .eq("mac_address", MAC_ADDRESS)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching data:', error);
          return;
        }

        if (latestData && isSubscribed) {
          console.log('New data received:', latestData);
          handleVitalUpdate(latestData);
        }
      } catch (error) {
        console.error('Error in fetchLatestData:', error);
      }
    };

    // Set up real-time subscription for all changes
    const channel = supabase
      .channel('health-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'Health Status',
          filter: `mac_address=eq.${MAC_ADDRESS}`
        },
        payload => {
          console.log('Real-time update received:', payload);
          if (payload.new && isSubscribed) {
            handleVitalUpdate(payload.new);
          }
        }
      )
      .subscribe();

    // Set up polling interval
    const pollInterval = setInterval(fetchLatestData, 1000); // Poll every second

    // Initial fetch
    fetchLatestData();

    // Cleanup function
    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      channel.unsubscribe();
    };
  }, [handleVitalUpdate]);

  // Update the VitalsCard component
  const VitalsCard = ({ icon: Icon, title, value, unit, color, vitalName }: {
    icon: any;
    title: string;
    value: number | string | null;
    unit?: string;
    color: string;
    vitalName: keyof typeof vitalStatuses;
  }) => (
    <Card className={`bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
      ${vitalStatuses[vitalName].isCritical ? 'border-2 border-red-500' : ''}`}>
      <CardContent className="p-3 flex items-center space-x-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-md font-bold ${
              value === null ? 'text-gray-400' :
              vitalStatuses[vitalName].isCritical ? 'text-red-600' : 
              'text-gray-900'
            }`}>
              {value ?? "Loading..."}
            </span>
            {unit && value !== null && (
              <span className="text-[10px] text-gray-400">{unit}</span>
            )}
            {vitalStatuses[vitalName].isCritical && (
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            )}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-[8px] text-gray-400 mt-1">
              
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Vital Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <VitalsCard
          icon={HeartPulse}
          title="Heart Rate"
          value={data.heart_rate}
          unit="bpm"
          color="bg-red-500"
          vitalName="heartRate"
        />
        <VitalsCard
          icon={Thermometer}
          title="Temperature"
          value={data.temperature?.toFixed(1)}
          unit="°C"
          color="bg-orange-500"
          vitalName="temperature"
        />
        <VitalsCard
          icon={Stethoscope}
          title="Blood Pressure"
          value={data.blood_pressure}
          unit="mmHg"
          color="bg-yellow-500"
          vitalName="bloodPressure"
        />
        
        <VitalsCard
          icon={Activity}
          title="Respiratory Rate"
          value={data.respiratory_rate}
          unit="rpm"
          color="bg-sky-400"
          vitalName="respiratoryRate"
        />

        <VitalsCard
          icon={User2Icon}
          title="Body Activity"
          value={data.respiratory_rate}
          unit="rpm"
          color="bg-green-500"
          vitalName="respiratoryRate"
        />
      </div>

     
      
    </div>
  );
}
