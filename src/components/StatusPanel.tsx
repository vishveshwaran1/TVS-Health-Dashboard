
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusPanelProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const StatusPanel = ({ title, value, icon, color }: StatusPanelProps) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-cyan-500 text-blue-100';
      case 'green':
        return 'from-green-500 to-emerald-500 text-green-100';
      case 'yellow':
        return 'from-yellow-500 to-orange-500 text-yellow-100';
      case 'red':
        return 'from-red-500 to-pink-500 text-red-100';
      default:
        return 'from-gray-500 to-slate-500 text-gray-100';
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 group hover:scale-105">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "w-12 h-12 rounded-lg bg-gradient-to-r flex items-center justify-center",
            getColorClasses(color)
          )}>
            {icon}
          </div>
          <div>
            <p className="text-gray-300 text-sm font-medium">{title}</p>
            <p className="text-white text-3xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusPanel;
