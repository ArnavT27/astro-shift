import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Satellite, Activity } from "lucide-react";
import Earth3D from "@/components/monitoring/Earth3D";
import SatellitePanel from "@/components/monitoring/SatellitePanel";
import DebrisPanel from "@/components/monitoring/DebrisPanel";
import SettingsPanel from "@/components/monitoring/SettingsPanel";
import ConjunctionAlert from "@/components/monitoring/ConjunctionAlert";
import SatelliteSearch from "@/components/monitoring/SatelliteSearch";
import {
  SatelliteData,
  DebrisData,
  ConjunctionEvent,
  sampleSatellites,
  sampleDebris,
  initializeSatellite,
  initializeDebris,
  propagateSatellite,
  propagateDebris,
  detectConjunctions,
} from "@/lib/satellite-utils";

export default function Monitoring() {
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [debris, setDebris] = useState<DebrisData[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteData | null>(null);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  
  // Settings
  const [showOrbits, setShowOrbits] = useState(true);
  const [showDebris, setShowDebris] = useState(false);
  const [satelliteStyle, setSatelliteStyle] = useState<'dot' | 'sphere'>('sphere');

  // Initialize satellites and debris
  useEffect(() => {
    const initializedSats = sampleSatellites.map(initializeSatellite);
    const initializedDebris = sampleDebris.slice(0, 300).map(initializeDebris);
    
    setSatellites(initializedSats);
    setDebris(initializedDebris);
  }, []);

  // Propagate positions
  const updatePositions = useCallback(() => {
    const now = new Date();
    
    setSatellites((sats) => sats.map((sat) => propagateSatellite(sat, now)));
    
    if (showDebris) {
      setDebris((deb) => deb.map((d) => propagateDebris(d, now)));
    }
  }, [showDebris]);

  // Update positions periodically
  useEffect(() => {
    updatePositions();
    const interval = setInterval(updatePositions, 1000);
    return () => clearInterval(interval);
  }, [updatePositions]);

  // Detect conjunctions periodically
  useEffect(() => {
    const detectEvents = () => {
      const events = detectConjunctions(satellites, debris, new Date(), 24);
      setConjunctions(events);
    };
    
    detectEvents();
    const interval = setInterval(detectEvents, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [satellites, debris]);

  // Update selected satellite when positions update
  useEffect(() => {
    if (selectedSatellite) {
      const updated = satellites.find((s) => s.id === selectedSatellite.id);
      if (updated) {
        setSelectedSatellite(updated);
      }
    }
  }, [satellites, selectedSatellite?.id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Satellite className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Satellite Monitoring</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
              <Activity className="w-4 h-4 text-success animate-pulse" />
              <span className="text-sm text-success font-medium">Live</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {satellites.length} satellites tracked
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 h-screen flex">
        {/* Left Sidebar */}
        <aside className="w-80 h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-4 border-r border-border bg-card/30">
          <SatelliteSearch
            satellites={satellites}
            onSelect={setSelectedSatellite}
            selectedId={selectedSatellite?.id}
          />
          
          <SatellitePanel satellite={selectedSatellite} />
          
          <DebrisPanel 
            debrisCount={debris.length} 
            isVisible={showDebris}
          />
        </aside>

        {/* 3D Globe */}
        <div className="flex-1 relative">
          <Earth3D
            satellites={satellites}
            debris={showDebris ? debris : []}
            selectedSatellite={selectedSatellite}
            onSelectSatellite={setSelectedSatellite}
            showOrbits={showOrbits}
            showDebris={showDebris}
            satelliteStyle={satelliteStyle}
          />
          
          {/* Stats Overlay */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border">
              <p className="text-xs text-muted-foreground">Satellites</p>
              <p className="text-lg font-bold text-primary">{satellites.length}</p>
            </div>
            {showDebris && (
              <div className="px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border">
                <p className="text-xs text-muted-foreground">Debris</p>
                <p className="text-lg font-bold text-destructive">{debris.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-4 border-l border-border bg-card/30">
          <SettingsPanel
            showOrbits={showOrbits}
            setShowOrbits={setShowOrbits}
            showDebris={showDebris}
            setShowDebris={setShowDebris}
            satelliteStyle={satelliteStyle}
            setSatelliteStyle={setSatelliteStyle}
          />
          
          <ConjunctionAlert events={conjunctions} />
        </aside>
      </main>
    </div>
  );
}
