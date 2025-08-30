import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../lib/supatest";

interface VitalChartProps {
  title: string;
  subtitle: string;
  deviceId: string;
}

const MAX_HISTORY_POINTS = 10;

const SingleVitalChart = ({ 
  data, 
  vitalKey, 
  color, 
  title, 
  unit 
}: { 
  data: any[];
  vitalKey: string;
  color: string;
  title: string;
  unit: string;
}) => (
  <Card className="h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
    <CardHeader className="p-3 pb-2 border-b">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }} />
        <CardTitle className="text-sm font-semibold text-gray-800">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-3 h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 9 }}
            height={20}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 9 }}
            width={30}
            domain={['auto', 'auto']}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.[0]) {
                return (
                  <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-2 shadow-lg">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-600">{label}</p>
                      <p className="text-sm font-bold" style={{ color }}>
                        {`${payload[0].value}${unit}`}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey={vitalKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: 'white', strokeWidth: 2, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

const VitalChart = ({ title, subtitle, deviceId }: VitalChartProps) => {
  // State for current values and history
  const [currentData, setCurrentData] = useState({
    heartRate: '--',
    temperature: '--',
    respiratoryRate: '--',
    bloodPressure: '--'
  });

  const [chartData, setChartData] = useState<Array<{
    time: string;
    heartRate: number | null;
    temperature: number | null;
    respiratoryRate: number | null;
    bloodPressure: number | null;
  }>>([]);

  // Add this helper function after the interfaces
  const isValidReading = (record: any): boolean => {
    return (
      record.heart_rate > 0 &&
      record.temperature > 0 &&
      record.respiratory_rate > 0 &&
      Number(record.blood_pressure?.split('/')[0]) > 0
    );
  };

  // Fetch data and update state
  useEffect(() => {
    const fetchVitals = async () => {
      try {
        const { data, error } = await supabase
          .from("Health Status")
          .select("*")
          .eq("mac_address", deviceId)
          .order("updated_at", { ascending: false })
          .limit(MAX_HISTORY_POINTS);

        if (error) throw error;

        if (data && data.length > 0) {
          const latest = data[0];
          
          // Check if latest reading has any zero values
          if (!isValidReading(latest)) {
            setCurrentData({
              heartRate: '0 bpm',
              temperature: '0°C',
              respiratoryRate: '0 bpm',
              bloodPressure: '0/0 mmHg'
            });
            setChartData([]); // Clear chart data
            return;
          }

          // Update current values from most recent reading
          setCurrentData({
            heartRate: `${latest.heart_rate} bpm`,
            temperature: `${latest.temperature}°C`,
            respiratoryRate: `${latest.respiratory_rate} bpm`,
            bloodPressure: `${latest.blood_pressure} mmHg`
          });

          // Only include readings where all values are non-zero
          const validData = data
            .filter(isValidReading)
            .reverse()
            .map(record => ({
              time: new Date(record.updated_at).toLocaleTimeString(),
              heartRate: Number(record.heart_rate),
              temperature: Number(record.temperature),
              respiratoryRate: Number(record.respiratory_rate),
              bloodPressure: Number(record.blood_pressure?.split('/')[0])
            }));

          setChartData(validData);
        }
      } catch (err) {
        console.error('Error fetching vitals:', err);
      }
    };

    fetchVitals(); // Initial fetch
    const interval = setInterval(fetchVitals, 1000); // Poll every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, [deviceId]);

  const charts = [
    {
      key: 'heartRate',
      title: 'Heart Rate',
      color: '#ef4444',
      unit: ' bpm'
    },
    {
      key: 'temperature',
      title: 'Temperature',
      color: '#FF9B00',
      unit: ' °C'
    },
    {
      key: 'respiratoryRate',
      title: 'Respiratory Rate',
      color: '#06b6d4',
      unit: ' bpm'
    },
    {
      key: 'bloodPressure',
      title: 'Blood Pressure',
      color: '#825B32',
      unit: ' mmHg'
    }
  ];

  return (
    <div className="h-full w-full flex flex-col space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm rounded-lg p-3 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-4">
          {charts.map(({ key, color, unit }) => (
            <div 
              key={key} 
              className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm"
            >
              <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }} />
              <p className="text-xs font-medium text-gray-600">
                {key.replace(/([A-Z])/g, ' $1').trim()}:
              </p>
              <p className="text-xs font-bold" style={{ color }}>
                {currentData[key]}
              </p>
            </div>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          {charts.map(chart => (
            <SingleVitalChart
              key={chart.key}
              data={chartData}
              vitalKey={chart.key}
              color={chart.color}
              title={chart.title}
              unit={chart.unit}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Waiting for valid readings...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalChart;
