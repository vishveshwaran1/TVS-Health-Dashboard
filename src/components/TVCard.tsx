
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Thermometer,
  Settings,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TVDevice {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
  resolution: string;
  temperature: number;
  volume: number;
  channel: string;
}

interface TVCardProps {
  device: TVDevice;
}

const TVCard = ({ device }: TVCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'online':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'offline':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105 hover:shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Monitor className="w-8 h-8 text-white" />
              <div className={cn(
                "absolute -top-1 -right-1 w-3 h-3 rounded-full",
                getStatusColor(device.status)
              )}></div>
            </div>
            <div>
              <CardTitle className="text-white text-lg">{device.name}</CardTitle>
              <p className="text-gray-300 text-sm">{device.location}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={getStatusBadgeVariant(device.status)}
            className="capitalize"
          >
            {device.status === 'online' && <Wifi className="w-3 h-3 mr-1" />}
            {device.status === 'offline' && <WifiOff className="w-3 h-3 mr-1" />}
            {device.status}
          </Badge>
          <span className="text-xs text-gray-400">{device.lastSeen}</span>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Resolution</p>
            <p className="text-white font-semibold">{device.resolution}</p>
          </div>
          <div>
            <p className="text-gray-400">Channel</p>
            <p className="text-white font-semibold">{device.channel}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm">Temperature</span>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              device.temperature > 50 ? "text-red-400" : 
              device.temperature > 45 ? "text-yellow-400" : "text-green-400"
            )}>
              {device.temperature}°C
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {device.volume > 0 ? (
                <Volume2 className="w-4 h-4 text-purple-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-white text-sm">Volume</span>
            </div>
            <span className="text-white text-sm font-semibold">{device.volume}%</span>
          </div>

          {/* Volume Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${device.volume}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="ghost" 
          className="w-full text-white border border-white/20 hover:bg-white/10 mt-4"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Device
        </Button>
      </CardContent>
    </Card>
  );
};

export default TVCard;
