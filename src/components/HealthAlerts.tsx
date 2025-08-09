import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supatest";

interface HealthAlertsProps {
  macAddress: string;
}

export default function HealthAlerts({ macAddress }: HealthAlertsProps) {
  const [alertStatus, setAlertStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [criticalCount, setCriticalCount] = useState(0);
  const [lastReadings, setLastReadings] = useState({
    heartRate: 0,
    temperature: 0,
    respiratoryRate: 0,
  });

  useEffect(() => {
    const checkVitals = async () => {
      const { data, error } = await supabase
        .from("Health Status")
        .select("heart_rate, temperature, respiratory_rate")
        .eq("mac_address", macAddress)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setLastReadings({
          heartRate: data.heart_rate,
          temperature: data.temperature,
          respiratoryRate: data.respiratory_rate,
        });

        // Check vital signs against normal ranges
        let isNormal = true;
        let isCritical = false;

        if (data.heart_rate < 60 || data.heart_rate > 100) isCritical = true;
        else if (data.heart_rate < 65 || data.heart_rate > 95) isNormal = false;

        if (data.temperature < 97 || data.temperature > 99) isCritical = true;
        else if (data.temperature < 97.5 || data.temperature > 98.5) isNormal = false;

        if (data.respiratory_rate < 12 || data.respiratory_rate > 20) isCritical = true;
        else if (data.respiratory_rate < 14 || data.respiratory_rate > 18) isNormal = false;

        // Update status based on readings
        if (isCritical) {
          setCriticalCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 5) setAlertStatus('critical');
            return newCount;
          });
        } else {
          setCriticalCount(0);
          setAlertStatus(isNormal ? 'normal' : 'warning');
        }
      }
    };

    const interval = setInterval(checkVitals, 5000);
    checkVitals(); // Initial check

    return () => clearInterval(interval);
  }, [macAddress]);

  const getStatusColor = () => {
    switch (alertStatus) {
      case 'critical': return 'bg-red-100 border-red-200 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-200 text-yellow-700';
      default: return 'bg-green-100 border-green-200 text-green-700';
    }
  };

  const getStatusIcon = () => {
    switch (alertStatus) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <Activity className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <Card className="bg-white rounded-3xl shadow-lg border-0 transform transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-gray-900 text-[16px] font-semibold">Health Alerts</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className={`p-3 rounded-xl border ${getStatusColor()} mb-3`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="font-medium">
              Status: {alertStatus.charAt(0).toUpperCase() + alertStatus.slice(1)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Heart Rate:</span>
            <span className={lastReadings.heartRate < 60 || lastReadings.heartRate > 100 ? 'text-red-600 font-medium' : 'text-gray-900'}>
              {lastReadings.heartRate} bpm
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Temperature:</span>
            <span className={lastReadings.temperature < 97 || lastReadings.temperature > 99 ? 'text-red-600 font-medium' : 'text-gray-900'}>
              {lastReadings.temperature}°C
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Respiratory Rate:</span>
            <span className={lastReadings.respiratoryRate < 12 || lastReadings.respiratoryRate > 20 ? 'text-red-600 font-medium' : 'text-gray-900'}>
              {lastReadings.respiratoryRate} rpm
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}