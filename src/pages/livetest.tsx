import { useEffect, useState } from "react";
import { supabase } from "../lib/supatest";
import { Card, CardContent } from "@/components/ui/card";
import {
  HeartPulse,
  Thermometer,
  Activity,
  Stethoscope,
  Hourglass,
} from "lucide-react";

const MAC_ADDRESS ="18:8B:0E:91:8B:98"; // Replace with the actual MAC address

export default function VitalsDashboard() {
  const [data, setData] = useState({
    heart_rate: null,
    temperature: null,
    blood_pressure: "--",
    respiratory_rate: null,
  });

  // 🔁 Polling every 5 seconds to keep data fresh
  useEffect(() => {
    const fetchVitals = async () => {
      const { data, error } = await supabase
        .from("Health Status")
        .select("*")
        .eq("mac_address", MAC_ADDRESS)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setData({
          heart_rate: data.heart_rate,
          temperature: data.temperature,
          blood_pressure: data.blood_pressure,
          respiratory_rate: data.respiratory_rate,
        });
        console.log("Fetched vitals data:", data);
      } else {
        console.error("Polling fetch error:", error);
      }
    };

    fetchVitals(); // Initial fetch
    const interval = setInterval(fetchVitals, 1000); // Poll every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const VitalsCard = ({
    icon: Icon,
    title,
    value,
    unit,
    color,
  }: {
    icon: any;
    title: string;
    value: string | number | null;
    unit?: string;
    color?: string;
  }) => (
    <Card className="bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
      <CardContent className="p-3 flex items-center space-x-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <div className="flex items-baseline space-x-1">
            <span className="text-md font-bold text-gray-900">{value ?? "--"}</span>
            {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <VitalsCard
        icon={HeartPulse}
        title="Heart Rate"
        value={data.heart_rate}
        unit="bpm"
        color="bg-red-500"
      />
      <VitalsCard
        icon={Thermometer}
        title="Temperature"
        value={data.temperature?.toFixed(1)}
        unit="°C"
        color="bg-blue-500"
      />
      <VitalsCard
        icon={Stethoscope}
        title="Blood Pressure"
        value={data.blood_pressure}
        unit="mmHg"
        color="bg-purple-500"
      />
      <VitalsCard
        icon={Activity}
        title="Respiratory Rate"
        value={data.respiratory_rate}
        unit="rpm"
        color="bg-green-500"
      />
       <VitalsCard
        icon={Hourglass}
        title="body activity"
        value={data.respiratory_rate}
        unit="rpm"
        color="bg-blue-500"
      />
      
    </div>
  );
}
