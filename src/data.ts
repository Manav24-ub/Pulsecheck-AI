import { AnalysisSession } from './types';

export const GREEN_SESSION: AnalysisSession = {
  id: 'session-opt-001',
  title: 'Sarah Jenkins - Routine Panel',
  patientName: 'Sarah Jenkins',
  age: 34,
  gender: 'Female',
  date: '2026-06-08',
  triageStatus: 'GREEN',
  summaryText: 'Overall excellent metabolic, blood-forming, and system filtration wellness. No critical flags. All main panels remain within range.',
  clinicalInterpretation: 'Your biochemical profile shows optimal pancreatic insulin response, healthy lipid synthesis, and pristine kidney waste clearance. Liver enzymes are stable and blood cell counts show a robust, non-inflamed immune state.',
  primaryRecommendation: 'Schedule your next standard annual physical. Continue maintaining your excellent health habits with regular exercise and balanced nutrition.',
  biomarkers: [
    {
      name: 'Fasting Blood Glucose',
      category: 'Metabolic Health',
      value: 88,
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      status: 'Normal',
      explanation: 'Reflects excellent glycemic control and normal insulin response of tissues during fasting.',
      lifestyleInsights: ['Maintain high-fiber intake through colorful vegetables.', 'Keep dietary starch and simple sugars complex and whole.']
    },
    {
      name: 'HbA1c (Glycated Hemoglobin)',
      category: 'Metabolic Health',
      value: 5.3,
      unit: '%',
      referenceRange: '4.0 - 5.6',
      status: 'Normal',
      explanation: 'Indicates average glucose levels over the past 3 months. Well below the pre-diabetic threshold of 5.7%.',
      lifestyleInsights: ['Continue with constant physical routines.', 'Limit highly refined convenience snacks.']
    },
    {
      name: 'LDL Cholesterol',
      category: 'Lipid Profile',
      value: 92,
      unit: 'mg/dL',
      referenceRange: '< 100',
      status: 'Normal',
      explanation: 'Optimal range of "bad" cholesterol. Lowers likelihood of plaque build-up within arteries.',
      lifestyleInsights: ['Prioritize heart-healthy olive oils.', 'Consume omega-3 rich seeds like chia or flax.']
    },
    {
      name: 'HDL Cholesterol',
      category: 'Lipid Profile',
      value: 64,
      unit: 'mg/dL',
      referenceRange: '> 50',
      status: 'Normal',
      explanation: 'High-density "good" cholesterol that actively clears fatty debris from the vascular system.',
      lifestyleInsights: ['Maintain regular cardiovascular workouts (e.g. brisk walking, cycling).']
    },
    {
      name: 'Serum Creatinine',
      category: 'Renal Function',
      value: 0.78,
      unit: 'mg/dL',
      referenceRange: '0.50 - 1.10',
      status: 'Normal',
      explanation: 'Excellent waste filtration rate by kidneys, reflective of proper muscle mass metabolism and hydration.',
      lifestyleInsights: ['Maintain consistent fluid intake during high-sweat routines.']
    },
    {
      name: 'Vitamin D (25-Hydroxy)',
      category: 'Nutritional / Bone',
      value: 31.5,
      unit: 'ng/mL',
      referenceRange: '30.0 - 100.0',
      status: 'Normal',
      explanation: 'Adequate vitamin level, although on the lower end of optimal baseline supporting skeletal density.',
      lifestyleInsights: ['Ensure 10-15 minutes of safe midday direct sunlight.', 'Consider a small daily dietary supplement of Vitamin D3 (1000 IU).']
    }
  ]
};

export const YELLOW_SESSION: AnalysisSession = {
  id: 'session-att-002',
  title: 'Marcus Vance - Metabolic Screening',
  patientName: 'Marcus Vance',
  age: 52,
  gender: 'Male',
  date: '2026-06-05',
  triageStatus: 'YELLOW',
  summaryText: 'Mild to moderate lipid and metabolic elevations. Findings suggest early-stage insulin resistance and metabolic variance.',
  clinicalInterpretation: 'Both fasting glucose and three-month HbA1c are within the pre-diabetic range. This shifts your cells into minor carbohydrate intolerance, closely coupled with slightly elevated triglycerides and atherogenic LDL cholesterol.',
  primaryRecommendation: 'Schedule a routine primary doctor consultation in the next 2-4 weeks. Consider starting structured nutritional changes focused on carb moderation.',
  biomarkers: [
    {
      name: 'Fasting Blood Glucose',
      category: 'Metabolic Health',
      value: 118,
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      status: 'High',
      explanation: 'Elevated fasting glucose indicating that liver glucose output is high and insulin sensitivity is slightly impaired.',
      lifestyleInsights: ['Switch processed breakfast options to scrambled eggs, spinach, or oatmeal.', 'Take a light 15-minute walk immediately following your heaviest daily meal.']
    },
    {
      name: 'HbA1c (Glycated Hemoglobin)',
      category: 'Metabolic Health',
      value: 5.9,
      unit: '%',
      referenceRange: '4.0 - 5.6',
      status: 'High',
      explanation: 'Average glycemic exposure matches the pre-diabetes classification (5.7% to 6.4%).',
      lifestyleInsights: ['Restrict sugary refreshments and syrup sweeteners.', 'Add simple, consistent muscle-training exercises twice a week.']
    },
    {
      name: 'LDL Cholesterol',
      category: 'Lipid Profile',
      value: 138,
      unit: 'mg/dL',
      referenceRange: '< 100',
      status: 'High',
      explanation: 'Borderline elevated low-density lipoprotein. Excess LDL can undergo vascular oxidation, forming plaques.',
      lifestyleInsights: ['Swap butter or animal fat with cold-pressed olive or avocado oil.', 'Incorporate 5g to 10g of soluble fiber (found on oats or psyllium) per day.']
    },
    {
      name: 'Triglycerides',
      category: 'Lipid Profile',
      value: 185,
      unit: 'mg/dL',
      referenceRange: '< 150',
      status: 'High',
      explanation: 'Moderately high triglycerides, frequently indicating surplus consumption of rapid-burning sugars, alcohol, or starch.',
      lifestyleInsights: ['Cut down alcoholic drinks and refined soda intake.', 'Focus on moderate aerobic activity to burn free-floating serum lipids.']
    },
    {
      name: 'Vitamin D (25-Hydroxy)',
      category: 'Nutritional / Bone',
      value: 18.2,
      unit: 'ng/mL',
      referenceRange: '30.0 - 100.0',
      status: 'Low',
      explanation: 'Insufficient levels. May lead to sluggish calcium absorption, lower immune defense, and persistent fatigue.',
      lifestyleInsights: ['Consult with a provider about adding 2000 IU or 5000 IU of D3 combined with K2 daily.', 'Add dietary options like wild salmon, sardines, and fortified dairy.']
    },
    {
      name: 'Serum Creatinine',
      category: 'Renal Function',
      value: 0.95,
      unit: 'mg/dL',
      referenceRange: '0.60 - 1.20',
      status: 'Normal',
      explanation: 'Excellent kidney performance. Renal clearing capability is completely preserved.',
      lifestyleInsights: ['Ensure steady, healthy hydration of about 2.5L representing pure water daily.']
    }
  ]
};

export const RED_SESSION: AnalysisSession = {
  id: 'session-urg-003',
  title: 'Elizabeth Thorne - Renal Panel',
  patientName: 'Elizabeth Thorne',
  age: 68,
  gender: 'Female',
  date: '2026-06-10',
  triageStatus: 'RED',
  summaryText: 'CRITICAL URGENT FLAG: Highly elevated kidney biomarkers and serum potassium require rapid medical evaluation.',
  clinicalInterpretation: 'Significant laboratory signs representing acute-on-chronic renal impairment. Highly elevated creatinine and urea nitrogen levels point to a critical decline in waste filtration. Simultaneously, serum potassium has risen to a level that requires clinical surveillance due to potential cardiac electrical sensitivity.',
  primaryRecommendation: 'Please contact your primary physician immediately or go to the nearest emergency or urgent care center today for evaluation of these high potassium and renal markers.',
  biomarkers: [
    {
      name: 'Serum Creatinine',
      category: 'Renal Function',
      value: 2.45,
      unit: 'mg/dL',
      referenceRange: '0.50 - 1.10',
      status: 'High',
      explanation: 'Critically elevated creatinine levels. This indicates your kidneys are operating at a significantly reduced rate of waste filtering and blood detoxification.',
      lifestyleInsights: ['STRICTLY avoid over-the-counter NSAIDs (like Ibuprofen, Naproxen, or Advil) as they drastically worsen renal perfusion.', 'Seek guidance from a renal dietician to regulate water intake and metabolic waste stress.']
    },
    {
      name: 'BUN (Blood Urea Nitrogen)',
      category: 'Renal Function',
      value: 48,
      unit: 'mg/dL',
      referenceRange: '6 - 20',
      status: 'High',
      explanation: 'Markedly high nitrogen waste buildup in your blood, which occurs when kidney glomerular filtration is severely sluggish.',
      lifestyleInsights: ['Consult your nephrologist before taking dietary protein supplements.', 'Ensure you do not over-exert under sun or dehydrating exercises.']
    },
    {
      name: 'Serum Potassium',
      category: 'Renal Function / Electrolyte',
      value: 5.7,
      unit: 'mEq/L',
      referenceRange: '3.5 - 5.1',
      status: 'High',
      explanation: 'Elevated blood potassium (hyperkalemia). High potassium can alter heart rate and trigger critical cardiac arrhythmias.',
      lifestyleInsights: ['Immediately restrict potassium-rich vegetables and fruits (such as bananas, cooked spinach, avocados, tomatoes, and potatoes).', 'Completely avoid using low-sodium "salt-substitutes" which contain high potassium chloride.']
    },
    {
      name: 'Hemoglobin',
      category: 'Blood / Hematology',
      value: 9.6,
      unit: 'g/dL',
      referenceRange: '12.0 - 16.0',
      status: 'Low',
      explanation: 'Anemia detected. Chronic or acute renal variance often curtails the kidneys\' creation of erythropoietin, an vital hormone telling bone marrow to build fresh red blood cells.',
      lifestyleInsights: ['Do not start iron supplements without your doctor checking your total iron-binding capacity.', 'Ensure adequate clinical review of cardiac work, as anemia can induce minor fatigue or breathing shortness.']
    },
    {
      name: 'Fasting Blood Glucose',
      category: 'Metabolic Health',
      value: 102,
      unit: 'mg/dL',
      referenceRange: '70 - 99',
      status: 'High',
      explanation: 'Slightly elevated fasting blood sugar, typical in metabolic stress or during physiologic shock responses.',
      lifestyleInsights: ['Avoid processed white flour carbohydrates and fast candies.']
    }
  ]
};

export const INITIAL_HISTORY: AnalysisSession[] = [
  { ...GREEN_SESSION },
  { ...YELLOW_SESSION },
  { ...RED_SESSION }
];

// Helper to simulate smart analysis based on uploaded text / file name
export function parseUploadedReport(fileName: string, rawText: string): AnalysisSession {
  const normalizedFilename = fileName.toLowerCase();
  const normalizedText = rawText.toLowerCase();
  const combined = `${normalizedFilename} ${normalizedText}`;

  let selectedTemplate: AnalysisSession;
  let summaryPrefix = "";

  if (
    combined.includes('renal') ||
    combined.includes('kidney') ||
    combined.includes('potassium') ||
    combined.includes('creatinine') ||
    combined.includes('elizabeth') ||
    combined.includes('severe') ||
    combined.includes('critical') ||
    combined.includes('red') ||
    combined.includes('urgent') ||
    combined.includes('crisis') ||
    combined.includes('high potassium')
  ) {
    selectedTemplate = RED_SESSION;
    summaryPrefix = `Analyzed "${fileName}": Severe flags caught. `;
  } else if (
    combined.includes('glucose') ||
    combined.includes('sugar') ||
    combined.includes('yellow') ||
    combined.includes('diabetes') ||
    combined.includes('pre-diabetic') ||
    combined.includes('lipid') ||
    combined.includes('cholesterol') ||
    combined.includes('marcus') ||
    combined.includes('moderate') ||
    combined.includes('fatigue')
  ) {
    selectedTemplate = YELLOW_SESSION;
    summaryPrefix = `Analyzed "${fileName}": Metabolic elevations detected. `;
  } else {
    selectedTemplate = GREEN_SESSION;
    summaryPrefix = `Analyzed "${fileName}": Wellness markers within normal range. `;
  }

  // Generate a unique session representation
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return {
    ...selectedTemplate,
    id: `session-auto-${randomSuffix}`,
    title: `${fileName === 'Manually Entered Raw Data' ? 'Manual Entry Analysis' : fileName} (${selectedTemplate.triageStatus === 'RED' ? 'Urgent' : selectedTemplate.triageStatus === 'YELLOW' ? 'Attention' : 'Normal'})`,
    date: new Date().toISOString().split('T')[0],
    summaryText: `${summaryPrefix}${selectedTemplate.summaryText}`
  };
}
