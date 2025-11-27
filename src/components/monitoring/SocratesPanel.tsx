import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, RefreshCw, Satellite, Clock, TrendingUp } from 'lucide-react';
import { 
  SocratesConjunction, 
  fetchSocratesData, 
  getRiskLevelFromProbability,
  getRiskColorFromProbability 
} from '@/lib/keeptrack-api';
import { useToast } from '@/hooks/use-toast';

export default function SocratesPanel() {
  const [conjunctions, setConjunctions] = useState<SocratesConjunction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const loadConjunctions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSocratesData();
      setConjunctions(data);
      
      // Count critical events
      const criticalCount = data.filter(c => c.MAX_PROB >= 0.5).length;
      const highCount = data.filter(c => c.MAX_PROB >= 0.2 && c.MAX_PROB < 0.5).length;
      
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
        description: "Could not fetch conjunction data from Keeptrack API",
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
  
  const criticalCount = conjunctions.filter(c => c.MAX_PROB >= 0.5).length;
  const highCount = conjunctions.filter(c => c.MAX_PROB >= 0.2 && c.MAX_PROB < 0.5).length;
  
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
          Data from NASA SOCRATES via Keeptrack API
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
              {conjunctions.map((conjunction) => (
                <ConjunctionCard key={conjunction.ID} conjunction={conjunction} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ConjunctionCard({ conjunction }: { conjunction: SocratesConjunction }) {
  const riskLevel = getRiskLevelFromProbability(conjunction.MAX_PROB);
  const riskColor = getRiskColorFromProbability(conjunction.MAX_PROB);
  const toca = new Date(conjunction.TOCA);
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
          {riskLevel.toUpperCase()} • {(conjunction.MAX_PROB * 100).toFixed(1)}%
        </Badge>
        <span className="text-xs font-mono text-primary font-bold">
          {conjunction.MIN_RNG.toFixed(3)} km
        </span>
      </div>
      
      {/* Satellite Names */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-1 text-xs">
          <Satellite className="w-3 h-3 text-foreground" />
          <span className="font-medium text-foreground truncate">{conjunction.SAT1_NAME}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {conjunction.SAT1_STATUS === 'Operational' ? 'OP' : 'NON-OP'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Satellite className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium text-muted-foreground truncate">{conjunction.SAT2_NAME}</span>
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {conjunction.SAT2_STATUS === 'Operational' ? 'OP' : 'NON-OP'}
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
          <span>{conjunction.REL_SPEED.toFixed(2)} km/s</span>
        </div>
      </div>
      
      {/* Time of Closest Approach */}
      <p className="text-[10px] text-muted-foreground mt-2">
        TCA: {toca.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </p>
    </div>
  );
}
