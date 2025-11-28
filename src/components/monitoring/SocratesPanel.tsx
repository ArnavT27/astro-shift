import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, RefreshCw, Satellite, Clock, TrendingUp } from 'lucide-react';
import { 
  CelesTrakConjunction, 
  fetchCelesTrakSocratesData, 
  getRiskLevelFromProbability,
  getRiskColorFromProbability,
  getRiskLevelFromRange 
} from '@/lib/celestrak-api';
import { useToast } from '@/hooks/use-toast';

export default function SocratesPanel() {
  const [conjunctions, setConjunctions] = useState<CelesTrakConjunction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const loadConjunctions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCelesTrakSocratesData();
      setConjunctions(data);
      
      // Count critical events (probability >= 1e-4 or range <= 500m)
      const criticalCount = data.filter(c => c.MAX_PROB >= 1e-4 || c.TCA_RANGE <= 500).length;
      const highCount = data.filter(c => 
        (c.MAX_PROB >= 1e-5 && c.MAX_PROB < 1e-4) || 
        (c.TCA_RANGE > 500 && c.TCA_RANGE <= 1000)
      ).length;
      
      if (criticalCount > 0) {
        toast({
          title: "Critical Conjunctions Detected",
          description: `${criticalCount} high-risk collision events found!`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Load Data",
        description: "Could not fetch conjunction data from CelesTrak API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadConjunctions();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadConjunctions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const criticalCount = conjunctions.filter(c => c.MAX_PROB >= 1e-4 || c.TCA_RANGE <= 500).length;
  const highCount = conjunctions.filter(c => 
    (c.MAX_PROB >= 1e-5 && c.MAX_PROB < 1e-4) || 
    (c.TCA_RANGE > 500 && c.TCA_RANGE <= 1000)
  ).length;
  
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Real-World Conjunctions
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={loadConjunctions}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Data from CelesTrak SOCRATES
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold text-primary">{conjunctions.length}</p>
          </div>
          <div className="bg-destructive/10 rounded-lg p-2">
            <p className="text-xs text-muted-foreground">High Risk</p>
            <p className="text-2xl font-bold text-destructive">{criticalCount + highCount}</p>
          </div>
        </div>
        
        {/* Conjunction List */}
        <ScrollArea className="h-[400px]">
          {conjunctions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isLoading ? 'Loading conjunction data...' : 'No conjunctions detected'}
            </p>
          ) : (
            <div className="space-y-2">
              {conjunctions.slice(0, 50).map((conjunction, idx) => (
                <ConjunctionCard key={`${conjunction.NORAD_CAT_ID_1}-${conjunction.NORAD_CAT_ID_2}-${idx}`} conjunction={conjunction} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ConjunctionCard({ conjunction }: { conjunction: CelesTrakConjunction }) {
  const probRiskLevel = getRiskLevelFromProbability(conjunction.MAX_PROB);
  const rangeRiskLevel = getRiskLevelFromRange(conjunction.TCA_RANGE);
  
  // Use the higher risk level
  const riskLevel = probRiskLevel === 'critical' || rangeRiskLevel === 'critical' ? 'critical' :
                    probRiskLevel === 'high' || rangeRiskLevel === 'high' ? 'high' :
                    probRiskLevel === 'medium' || rangeRiskLevel === 'medium' ? 'medium' : 'low';
  
  const riskColor = getRiskColorFromProbability(
    riskLevel === 'critical' ? 1e-4 :
    riskLevel === 'high' ? 1e-5 :
    riskLevel === 'medium' ? 1e-6 : 1e-7
  );
  
  const toca = new Date(conjunction.TCA);
  const timeUntil = toca.getTime() - Date.now();
  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
  
  return (
    <div 
      className="p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors"
      style={{ borderLeftColor: riskColor, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant="outline" 
          className="text-xs font-semibold"
          style={{ color: riskColor, borderColor: riskColor }}
        >
          {riskLevel.toUpperCase()} • {conjunction.MAX_PROB.toExponential(2)}
        </Badge>
        <span className="text-xs font-mono text-primary font-bold">
          {(conjunction.TCA_RANGE / 1000).toFixed(3)} km
        </span>
      </div>
      
      {/* Satellite Names */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-1 text-xs">
          <Satellite className="w-3 h-3 text-foreground" />
          <span className="font-medium text-foreground truncate">{conjunction.OBJECT_NAME_1}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {conjunction.NORAD_CAT_ID_1}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Satellite className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-muted-foreground truncate">{conjunction.OBJECT_NAME_2}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {conjunction.NORAD_CAT_ID_2}
          </Badge>
        </div>
      </div>
      
      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{hoursUntil > 0 ? `in ${hoursUntil}h` : 'Past'}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>{(conjunction.TCA_RELATIVE_SPEED / 1000).toFixed(2)} km/s</span>
        </div>
      </div>
      
      {/* Time of Closest Approach & Days Since Epoch */}
      <div className="mt-2 space-y-1">
        <p className="text-[10px] text-muted-foreground">
          TCA: {toca.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
        <p className="text-[10px] text-muted-foreground">
          DSE: {conjunction.DSE_1.toFixed(1)}d / {conjunction.DSE_2.toFixed(1)}d
        </p>
      </div>
    </div>
  );
}
