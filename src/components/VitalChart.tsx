import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../lib/supatest";

interface VitalChartProps {
  title: string;
  subtitle: string;
  deviceId: string;
}

const MAX_HISTORY_POINTS = 10;

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
          // Update current values from most recent reading
          const latest = data[0];
          setCurrentData({
            heartRate: `${latest.heart_rate} bpm`,
            temperature: `${latest.temperature}°F`,
            respiratoryRate: `${latest.respiratory_rate} bpm`,
            bloodPressure: `${latest.blood_pressure}/80 mmHg`
          });

          // Format historical data for chart
          const formattedData = data.reverse().map(record => ({
            time: new Date(record.updated_at).toLocaleTimeString(),
            heartRate: Number(record.heart_rate),
            temperature: Number(record.temperature),
            respiratoryRate: Number(record.respiratory_rate),
            bloodPressure: Number(record.blood_pressure?.split('/')[0]) // Extract systolic BP
          }));

          setChartData(formattedData);
        }
      } catch (err) {
        console.error('Error fetching vitals:', err);
      }
    };

    fetchVitals(); // Initial fetch
    const interval = setInterval(fetchVitals, 1000); // Poll every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, [deviceId]);

  const colors = {
    heartRate: '#ef4444',
    temperature: '#3b82f6',
    respiratoryRate: '#06b6d4',
    bloodPressure: '#f59e0b'
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 flex-shrink-0">
        <p className="text-gray-600 text-xs mb-2 sm:mb-0">{subtitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <p className="text-xs font-medium" style={{ color: colors.heartRate }}>
            HR: {currentData.heartRate}
          </p>
          <p className="text-xs font-medium" style={{ color: colors.temperature }}>
            Temp: {currentData.temperature}
          </p>
          <p className="text-xs font-medium" style={{ color: colors.respiratoryRate }}>
            RR: {currentData.respiratoryRate}
          </p>
          <p className="text-xs font-medium" style={{ color: colors.bloodPressure }}>
            BP: {currentData.bloodPressure}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChartContainer 
          className="h-full w-full"
          config={{
            line: {
              color: "#000000",
              label: "Line Chart"
            },
            heartRate: {
              color: colors.heartRate,
              label: "Heart Rate"
            },
            temperature: {
              color: colors.temperature,
              label: "Temperature"
            },
            respiratoryRate: {
              color: colors.respiratoryRate,
              label: "Respiratory Rate"
            },
            bloodPressure: {
              color: colors.bloodPressure,
              label: "Blood Pressure"
            }
          }}
        >
          <ResponsiveContainer>
            <LineChart 
              data={chartData}
              margin={{ top: 10, right: 35, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              
              <XAxis
                dataKey="time"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                height={30} // Added fixed height for X-axis
                interval="preserveStartEnd" // Ensures start and end labels are shown
                tickMargin={8} // Added margin between ticks and axis line
              />

              <YAxis
                yAxisId="universal"
                orientation="left"
                stroke="#6b7280"
                domain={[0, 200]}
                tickCount={21}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                width={40} // Added fixed width for Y-axis
                tickMargin={4} // Added margin between ticks and axis line
              />

              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white p-2 shadow-xl">
                        <p className="mb-1 text-xs font-bold">{label}</p>
                        {payload.map((entry: any) => {
                          const value = entry.value;
                          let displayValue = value;
                          let unit = "";

                          switch (entry.dataKey) {
                            case "heartRate":
                              unit = " bpm";
                              break;
                            case "temperature":
                              unit = " °F";
                              break;
                            case "respiratoryRate":
                              unit = " bpm";
                              break;
                            case "bloodPressure":
                              unit = " mmHg";
                              displayValue = `${value}/80`;
                              break;
                          }

                          return (
                            <p 
                              key={entry.name} 
                              className="text-xs" 
                              style={{ color: entry.color }}
                            >
                              {`${entry.name}: ${displayValue}${unit}`}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Line
                type="monotone"
                dataKey="heartRate"
                name="Heart Rate"
                stroke={colors.heartRate}
                yAxisId="universal"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: colors.heartRate, strokeWidth: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature"
                stroke={colors.temperature}
                yAxisId="universal"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: colors.temperature, strokeWidth: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="respiratoryRate"
                name="Respiratory Rate"
                stroke={colors.respiratoryRate}
                yAxisId="universal"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: colors.respiratoryRate, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: colors.respiratoryRate, strokeWidth: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="bloodPressure"
                name="Blood Pressure"
                stroke={colors.bloodPressure}
                yAxisId="universal"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ fill: colors.bloodPressure, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 4, stroke: colors.bloodPressure, strokeWidth: 2 }}
                connectNulls
              />

              <ChartLegend 
                verticalAlign="bottom"
                height={36}
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-4 pt-2"> {/* Added flex-wrap */}
                    {payload?.map((entry: any) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div 
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};

export default VitalChart;
