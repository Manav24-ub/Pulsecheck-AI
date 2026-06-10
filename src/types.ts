export interface Biomarker {
  name: string;
  category: string;
  value: string | number;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'High' | 'Low';
  explanation: string;
  lifestyleInsights: string[];
}

export type TriageStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface AnalysisSession {
  id: string;
  title: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  date: string;
  triageStatus: TriageStatus;
  summaryText: string;
  clinicalInterpretation: string;
  primaryRecommendation: string;
  biomarkers: Biomarker[];
}
