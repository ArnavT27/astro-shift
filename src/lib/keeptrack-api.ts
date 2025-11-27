// Keeptrack SOCRATES API integration
// Credit: Data provided by KeepTrack.space (CC BY-NC 4.0)

export interface SocratesConjunction {
  ID: number;
  SAT1: string;
  SAT1_NAME: string;
  SAT1_STATUS: string;
  SAT2: string;
  SAT2_NAME: string;
  SAT2_STATUS: string;
  SAT1_AGE_OF_TLE: number;
  SAT2_AGE_OF_TLE: number;
  TOCA: string; // Time of closest approach (ISO date)
  MIN_RNG: number; // Minimum range in km
  DILUTION_THRESHOLD: number;
  REL_SPEED: number; // km/s
  MAX_PROB: number; // Collision probability 0-1
}

const SOCRATES_API_URL = 'https://api.keeptrack.space/v2/socrates/latest';

export async function fetchSocratesData(): Promise<SocratesConjunction[]> {
  try {
    const response = await fetch(SOCRATES_API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch SOCRATES data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching SOCRATES data:', error);
    return [];
  }
}

export function getRiskLevelFromProbability(probability: number): 'low' | 'medium' | 'high' | 'critical' {
  if (probability >= 0.5) return 'critical';
  if (probability >= 0.2) return 'high';
  if (probability >= 0.05) return 'medium';
  return 'low';
}

export function getRiskColorFromProbability(probability: number): string {
  const level = getRiskLevelFromProbability(probability);
  switch (level) {
    case 'critical': return '#ff0000';
    case 'high': return '#ff4444';
    case 'medium': return '#ffaa00';
    case 'low': return '#ffdd00';
  }
}
