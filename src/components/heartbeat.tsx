

// HeartRateCard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supatest"; // ✅ import your Supabase client
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";

// Optional: Filter by a specific MAC address if needed
const MAC_ADDRESS = "B4:3A:45:8A:2B:40"; // Replace or make dynamic if needed

export default function HeartRateCard() {
  const [heartRate, setHeartRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("Health Status")
        .select("heart_rate")
        .eq("mac_address", MAC_ADDRESS)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setHeartRate(data.heart_rate);
    };

    fetchInitial();

    const channel = supabase
      .channel("health-status-stream")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Health Status",
          filter: `mac_address=eq.${MAC_ADDRESS}`,
        },
        (payload) => {
          setHeartRate(payload.new.heart_rate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="bg-white rounded-2xl shadow-lg border-spacing-2 transform transition-all duration-300 hover:shadow-xl hover:scale-105">
      <CardContent className="p-2">
        <div className="flex items-center space-x-1">
          <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-red-200 rounded-md flex items-center justify-center">
            <Heart className={`w-5 h-5 text-red-600 ${heartRate ? "animate-heartbeat" : ""}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-[12px]">Heart Rate</h3>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-sm font-bold text-gray-900">{heartRate ?? "--"}</span>
              <span className="text-[8px] text-gray-400">bpm</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
