
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Thermometer, 
  User,
  MapPin,
  Wifi
} from "lucide-react";

interface Person {
  id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  mac: string;
  status: 'normal' | 'warning' | 'critical';
  heartRate: number;
  temperature: number;
  photo: string;
  heartRateHistory: Array<{ time: string; value: number }>;
  temperatureHistory: Array<{ time: string; value: number }>;
}

interface PersonCardProps {
  person: Person;
  onSelect: () => void;
}

const PersonCard = ({ person, onSelect }: PersonCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'border-green-400 bg-green-500/10';
      case 'warning':
        return 'border-yellow-400 bg-yellow-500/10';
      case 'critical':
        return 'border-red-400 bg-red-500/10';
      default:
        return 'border-gray-400 bg-gray-500/10';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500 hover:bg-green-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Card className={`bg-white/10 backdrop-blur-lg border-2 hover:bg-white/15 transition-all duration-300 group hover:scale-105 ${getStatusColor(person.status)}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={person.photo} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                <User className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-white font-semibold text-lg">{person.name}</h3>
              <p className="text-gray-300 text-sm">{person.age} years • {person.gender}</p>
            </div>
          </div>
          <Badge className={getStatusBadgeColor(person.status)}>
            {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2 text-gray-300">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{person.location}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">{person.mac}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-gray-300 text-sm">Heart Rate</span>
            </div>
            <p className="text-white text-xl font-bold">{person.heartRate}</p>
            <p className="text-gray-400 text-xs">bpm</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Thermometer className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 text-sm">Temperature</span>
            </div>
            <p className="text-white text-xl font-bold">{person.temperature}</p>
            <p className="text-gray-400 text-xs">°F</p>
          </div>
        </div>

        <Button 
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default PersonCard;
