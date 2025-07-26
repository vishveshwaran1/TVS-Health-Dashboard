
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useState } from "react";

interface VitalData {
  time: string;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  bloodPressure: number;
}

interface VitalChartProps {
  title: string;
  subtitle: string;
  heartRateData: Array<{
    time: string;
    value: number;
  }>;
  temperatureData: Array<{
    time: string;
    value: number;
  }>;
  respiratoryRateData: Array<{
    time: string;
    value: number;
  }>;
  heartRateLatest: string;
  temperatureLatest: string;
  respiratoryRateLatest: string;
  bloodPressureLatest: string;
}

const VitalChart = ({
  title,
  subtitle,
  heartRateData,
  temperatureData,
  respiratoryRateData,
  heartRateLatest,
  temperatureLatest,
  respiratoryRateLatest,
  bloodPressureLatest
}: VitalChartProps) => {
  const [selectedVital, setSelectedVital] = useState<'heartRate' | 'temperature' | 'respiratoryRate' | 'bloodPressure'>('heartRate');

  // Generate mock data for blood pressure over time
  const bloodPressureData = heartRateData.map((item, index) => ({
    time: item.time,
    value: Math.floor(Math.random() * 40) + 100 // Random BP values between 100-140
  }));

  // Combine the data
  const combinedData: VitalData[] = heartRateData.map((hrItem, index) => ({
    time: hrItem.time,
    heartRate: hrItem.value,
    temperature: temperatureData[index]?.value || 0,
    respiratoryRate: respiratoryRateData[index]?.value || 0,
    bloodPressure: bloodPressureData[index]?.value || 120
  }));

  const vitalOptions = [
    { 
      value: 'heartRate', 
      label: 'Heart Rate', 
      color: '#ef4444', 
      unit: 'bpm', 
      normalRange: '60-100 bpm', 
      latest: heartRateLatest,
      type: 'line'
    },
    { 
      value: 'temperature', 
      label: 'Temperature', 
      color: '#3b82f6', 
      unit: '°F', 
      normalRange: '97-99°F', 
      latest: temperatureLatest,
      type: 'line'
    },
    { 
      value: 'respiratoryRate', 
      label: 'Respiratory Rate', 
      color: '#06b6d4', 
      unit: 'bpm', 
      normalRange: '12-20 bpm', 
      latest: respiratoryRateLatest,
      type: 'line'
    },
    { 
      value: 'bloodPressure', 
      label: 'Blood Pressure', 
      color: '#f59e0b', 
      unit: 'mmHg', 
      normalRange: '120/80 mmHg', 
      latest: bloodPressureLatest,
      type: 'line'
    }
  ];

  const currentVital = vitalOptions.find(v => v.value === selectedVital)!;

  const chartConfig = {
    [selectedVital]: {
      label: currentVital.unit,
      color: currentVital.color
    }
  };

  return (
    <div className="h-full w-full my-0 mx-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <p className="text-gray-600 text-xs">{subtitle}</p>
          <Select value={selectedVital} onValueChange={(value: 'heartRate' | 'temperature' | 'respiratoryRate' | 'bloodPressure') => setSelectedVital(value)}>
            <SelectTrigger className="w-48 h-7 text-xs bg-white border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
              {vitalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: option.color }}
                    ></div>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <p className="text-gray-600 text-xs">Latest: {currentVital.latest}</p>
          <p className="text-gray-500 text-xs">Normal: {currentVital.normalRange}</p>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          {currentVital.type === 'line' ? (
            <LineChart data={combinedData} margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5
            }}>
              <XAxis 
                dataKey="time" 
                tick={{
                  fill: '#6b7280',
                  fontSize: 10
                }} 
                axisLine={{
                  stroke: '#d1d5db'
                }} 
                tickLine={{
                  stroke: '#d1d5db'
                }} 
              />
              <YAxis 
                tick={{
                  fill: '#6b7280',
                  fontSize: 10
                }} 
                axisLine={{
                  stroke: '#d1d5db'
                }} 
                tickLine={{
                  stroke: '#d1d5db'
                }} 
              />
              <ChartTooltip 
                content={<ChartTooltipContent />} 
                labelStyle={{
                  color: '#6b7280'
                }} 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey={selectedVital} 
                stroke={currentVital.color} 
                strokeWidth={2} 
                dot={{
                  fill: currentVital.color,
                  strokeWidth: 2,
                  r: 3
                }} 
                activeDot={{
                  r: 4,
                  stroke: currentVital.color,
                  strokeWidth: 2
                }} 
              />
            </LineChart>
          ) : (
            <BarChart data={combinedData} margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5
            }}>
              <XAxis 
                dataKey="time" 
                tick={{
                  fill: '#6b7280',
                  fontSize: 10
                }} 
                axisLine={{
                  stroke: '#d1d5db'
                }} 
                tickLine={{
                  stroke: '#d1d5db'
                }} 
              />
              <YAxis 
                tick={{
                  fill: '#6b7280',
                  fontSize: 10
                }} 
                axisLine={{
                  stroke: '#d1d5db'
                }} 
                tickLine={{
                  stroke: '#d1d5db'
                }} 
              />
              <ChartTooltip 
                content={<ChartTooltipContent />} 
                labelStyle={{
                  color: '#6b7280'
                }} 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }} 
              />
              <Bar 
                dataKey={selectedVital} 
                fill={currentVital.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default VitalChart;
