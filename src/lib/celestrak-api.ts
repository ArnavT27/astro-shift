// CelesTrak SOCRATES API integration
// Data source: CelesTrak.org SOCRATES (Satellite Orbital Conjunction Reports Assessing Threatening Encounters in Space)

export interface CelesTrakConjunction {
  NORAD_CAT_ID_1: number;
  OBJECT_NAME_1: string;
  DSE_1: number; // Days since epoch for object 1
  NORAD_CAT_ID_2: number;
  OBJECT_NAME_2: string;
  DSE_2: number; // Days since epoch for object 2
  TCA: string; // Time of closest approach (ISO date)
  TCA_RANGE: number; // Minimum range in meters
  TCA_RELATIVE_SPEED: number; // m/s
  MAX_PROB: number; // Collision probability (scientific notation)
  DILUTION: number;
}

const CELESTRAK_SOCRATES_CSV_URL = 'https://celestrak.org/SOCRATES/sort-minRange.csv';

export async function fetchCelesTrakSocratesData(): Promise<CelesTrakConjunction[]> {
  try {
    const response = await fetch(CELESTRAK_SOCRATES_CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CelesTrak SOCRATES data: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const conjunctions: CelesTrakConjunction[] = dataLines.map(line => {
      const values = line.split(',');
      
      return {
        NORAD_CAT_ID_1: parseInt(values[0]),
        OBJECT_NAME_1: values[1].replace(/"/g, ''), // Remove quotes if present
        DSE_1: parseFloat(values[2]),
        NORAD_CAT_ID_2: parseInt(values[3]),
        OBJECT_NAME_2: values[4].replace(/"/g, ''),
        DSE_2: parseFloat(values[5]),
        TCA: values[6].replace(/"/g, ''),
        TCA_RANGE: parseFloat(values[7]),
        TCA_RELATIVE_SPEED: parseFloat(values[8]),
        MAX_PROB: parseFloat(values[9]),
        DILUTION: parseFloat(values[10]),
      };
    });
    
    return conjunctions.filter(c => !isNaN(c.NORAD_CAT_ID_1)); // Filter out invalid rows
  } catch (error) {
    console.error('Error fetching CelesTrak SOCRATES data:', error);
    return [];
  }
}

export function getRiskLevelFromProbability(probability: number): 'low' | 'medium' | 'high' | 'critical' {
  if (probability >= 1e-4) return 'critical'; // >= 0.0001
  if (probability >= 1e-5) return 'high';     // >= 0.00001
  if (probability >= 1e-6) return 'medium';   // >= 0.000001
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

export function getRiskLevelFromRange(rangeMeters: number): 'low' | 'medium' | 'high' | 'critical' {
  if (rangeMeters <= 500) return 'critical';
  if (rangeMeters <= 1000) return 'high';
  if (rangeMeters <= 5000) return 'medium';
  return 'low';
}
