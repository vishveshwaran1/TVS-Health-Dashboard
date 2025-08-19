import { useEffect, useState, useCallback } from "react";
import { AlertCircle, User2Icon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "../lib/supatest";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Thermometer, Activity, Stethoscope } from "lucide-react";

// Define vital ranges with warning thresholds
const VITAL_RANGES = {
  heartRate: { min: 60, max: 140 },
  temperature: { min: 25, max: 39 },
  respiratoryRate: { min: 8, max: 30 },
  bloodPressure: { min: 110, max: 130 },
  bodyActivity: { expectedValue: "Active" }
};

interface VitalStatus {
  count: number;
  lastAlertTime: number;
  isCritical: boolean;
  value?: string;
}

const MAC_ADDRESS ="18:8B:0E:91:8B:98"; // Replace with the actual MAC address

// Add interface for props
interface VitalsDashboardProps {
  onAlertGenerated?: (alert: {
    type: string;
    value: number;
    message: string;
    severity: 'warning' | 'critical';
  }) => void;
}

export default function VitalsDashboard({ onAlertGenerated }: VitalsDashboardProps) {
  const { toast } = useToast();
  const [data, setData] = useState({
    heart_rate: 0,
    temperature: 0,
    blood_pressure: "0",
    respiratory_rate: 0,
    body_activity: "No Data" // default value
  });

  // Use a single state object for tracking vital statuses
  const [vitalStatuses, setVitalStatuses] = useState<Record<string, VitalStatus>>({
    heartRate: { count: 0, lastAlertTime: 0, isCritical: false },
    temperature: { count: 0, lastAlertTime: 0, isCritical: false },
    respiratoryRate: { count: 0, lastAlertTime: 0, isCritical: false },
    bloodPressure: { count: 0, lastAlertTime: 0, isCritical: false },
    bodyActivity: { count: 0, lastAlertTime: 0, isCritical: false }
  });

  // Helper function to check if a vital is critical
  const checkVitalCritical = useCallback((vitalName: string, value: number | null): boolean => {
    if (value === null) return false;
    const range = VITAL_RANGES[vitalName as keyof typeof VITAL_RANGES];
    if ('expectedValue' in range) return false; // Skip numeric check for bodyActivity
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

  // Helper function to format body activity status
  const formatBodyActivity = (status: string | null): string => {
    if (!status) return "No Data";
    return status === "Active" ? "Active" : "Fall detected";
  };

  // Main function to handle vital sign updates
  const handleVitalUpdate = useCallback((newData: any) => {
    console.log('Handling vital update:', newData);

    if (!newData || typeof newData !== 'object') {
      console.error('Invalid data received:', newData);
      return;
    }

    // Check if any numeric value is zero or null
    const hasZeroValue = 
      !newData.heart_rate || 
      !newData.temperature || 
      !newData.respiratory_rate || 
      !newData.blood_pressure ||
      newData.heart_rate === 0 || 
      newData.temperature === 0 || 
      newData.respiratory_rate === 0 || 
      newData.blood_pressure === "0";

    // If any value is zero, set all values to zero
    const processedData = hasZeroValue ? {
      heart_rate: 0,
      temperature: 0,
      blood_pressure: "0",
      respiratory_rate: 0,
      body_activity: "No Data"
    } : newData;

    setData(prevData => {
      const hasChanges = JSON.stringify(prevData) !== JSON.stringify(processedData);
      if (hasChanges) {
        console.log('Updating data state:', processedData);
        return processedData;
      }
      return prevData;
    });

    const now = Date.now();
    const vitalsToCheck = {
      heartRate: processedData.heart_rate,
      temperature: processedData.temperature,
      respiratoryRate: processedData.respiratory_rate,
      bloodPressure: parseInt(processedData.blood_pressure?.split('/')[0]),
      bodyActivity: processedData.body_activity
    };

    // Reset all vital statuses if any value is zero
    if (hasZeroValue) {
      setVitalStatuses(prevStatuses => {
        const resetStatuses = { ...prevStatuses };
        Object.keys(resetStatuses).forEach(key => {
          resetStatuses[key] = {
            count: 0,
            lastAlertTime: 0,
            isCritical: false,
            value: key === 'bodyActivity' ? 'No Data' : undefined
          };
        });
        return resetStatuses;
      });
      return;
    }

    setVitalStatuses(prevStatuses => {
      const newStatuses = { ...prevStatuses };

      Object.entries(vitalsToCheck).forEach(([vitalName, value]) => {
        if (vitalName === 'bodyActivity') {
          const isCritical = value !== VITAL_RANGES.bodyActivity.expectedValue;
          const prevStatus = prevStatuses[vitalName];
          
          if (value !== prevStatus.value) {
            if (isCritical) {
              // Increment counter for critical readings
              const newCount = prevStatus.count + 1;
              const cooldownPassed = now - prevStatus.lastAlertTime > 10000;

              if (newCount >= 5 && cooldownPassed) {
                toast({
                  title: "⚠️ Activity Alert",
                  description: `Body Activity Status: ${value}`,
                  variant: "destructive",
                  duration: 5000,
                });

                onAlertGenerated?.({
                  type: 'body_activity',
                  value: 0,
                  message: `Body Activity Status: ${value}`,
                  severity: 'critical'
                });

                newStatuses[vitalName] = {
                  count: 0, // Reset counter after alert
                  lastAlertTime: now,
                  isCritical: true,
                  value: value
                };
              } else {
                // Increment counter but don't trigger alert yet
                newStatuses[vitalName] = {
                  count: newCount,
                  lastAlertTime: prevStatus.lastAlertTime,
                  isCritical: true,
                  value: value
                };
              }
            } else {
              // Reset counter when value returns to normal
              newStatuses[vitalName] = {
                count: 0,
                lastAlertTime: prevStatus.lastAlertTime,
                isCritical: false,
                value: value
              };
            }
          } else {
            // Preserve previous status if value hasn't changed
            newStatuses[vitalName] = { ...prevStatus };
          }
        } else {
          const isCritical = checkVitalCritical(vitalName, value);
          const prevStatus = prevStatuses[vitalName];
          const prevValue =
            vitalName === "heartRate" ? data.heart_rate :
            vitalName === "temperature" ? data.temperature :
            vitalName === "respiratoryRate" ? data.respiratory_rate :
            vitalName === "bloodPressure" ? parseInt(data.blood_pressure?.split('/')[0]) :
            vitalName === "bodyActivity" ? data.body_activity :
            null;

          // Only proceed if the value has changed
          if (value !== prevValue) {
            if (isCritical) {
              const newCount = prevStatus.count + 1;
              const cooldownPassed = now - prevStatus.lastAlertTime > 10000;

              if (newCount >= 5 && cooldownPassed && value !== null) {
                const { formatted, unit } = formatVitalValue(vitalName, value);
                
                // Show toast
                toast({
                  title: "⚠️ Critical Alert",
                  description: `${vitalName.replace(/([A-Z])/g, ' $1').trim()} is critical: ${formatted} ${unit}`,
                  variant: "destructive",
                  duration: 5000,
                });

                // Send alert to parent component
                onAlertGenerated?.({
                  type: vitalName.toLowerCase(),
                  value: Number(formatted),
                  message: `${vitalName.replace(/([A-Z])/g, ' $1').trim()} is critical: ${formatted} ${unit}`,
                  severity: 'critical'
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
        }
      });

      return newStatuses;
    });
  }, [checkVitalCritical, formatVitalValue, toast, data, onAlertGenerated]);

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
  const VitalsCard = ({ icon: Icon, title, value, unit, color, vitalName, isTextValue }: {
    icon: any;
    title: string;
    value: number | string | null;
    unit?: string;
    color: string;
    vitalName: keyof typeof vitalStatuses;
    isTextValue?: boolean;
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
              value === null || value === 0 ? 'text-gray-400' :
              vitalName === 'bodyActivity' ? 
                value === 'Active' ? 'text-green-600' : 'text-red-600' :
              vitalStatuses[vitalName].isCritical ? 'text-red-600' : 
              'text-gray-900'
            }`}>
              {vitalName === 'bodyActivity' ? 
                value === null ? "No Data" : formatBodyActivity(value as string) : 
                value ?? "0"}
            </span>
            {unit && !isTextValue && (
              <span className="text-[10px] text-gray-400">{unit}</span>
            )}
            {vitalStatuses[vitalName].isCritical && value !== 0 && (
              <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
            )}
          </div>
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
          value={data.body_activity}
          color={data.body_activity === "Active" ? "bg-green-500" : "bg-red-500"}
          vitalName="bodyActivity"
          isTextValue={true}
        />
      </div>

     
      
    </div>
  );
}
