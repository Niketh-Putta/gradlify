export const FOUNDER_EMAIL = "nikhath13@gmail.com";
export const FREE_DAILY_SCANS = 3;
export const DEFAULT_PROTEIN_GOAL = 150;
export const PROTEIN_PREMIUM_PRICE_GBP = 4.99;

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

export type FoodCategory =
  | "meat"
  | "poultry"
  | "fish"
  | "seafood"
  | "dairy"
  | "eggs"
  | "legumes"
  | "grains"
  | "vegetables"
  | "fruits"
  | "nuts"
  | "snacks"
  | "desserts"
  | "supplements"
  | "other";

export type FoodDatabaseEntry = {
  id: string;
  name: string;
  category: FoodCategory;
  proteinPer100g: number;
  aliases: string[];
  typicalPortionG?: number;
};

export type AnalyzedFoodItem = {
  name: string;
  category: FoodCategory | string;
  portionGrams: number;
  proteinGrams: number;
  confidence: number;
};

export type FoodAnalysisResult = {
  isFood: boolean;
  items: AnalyzedFoodItem[];
  totalProteinGrams: number;
  reasoning: string;
};

/** Legacy single-item shape used by existing UI hooks */
export type FoodAnalysis = {
  name: string;
  protein_g: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
  confidence: number;
  is_food: boolean;
  serving_size?: string;
  notes?: string;
  items?: AnalyzedFoodItem[];
  totalProteinGrams?: number;
  reasoning?: string;
};

export type ProteinProfile = {
  user_id: string;
  daily_goal_g: number;
  weight_kg: number | null;
  activity_level: ActivityLevel;
  is_premium: boolean;
  unlimited_scans: boolean;
  streak_count: number;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
};

export type ProteinMealLog = {
  id: string;
  user_id: string;
  food_name: string;
  food_category: string | null;
  portion_g: number | null;
  protein_g: number;
  confidence: number | null;
  is_food: boolean;
  image_url: string | null;
  ai_raw_json: Record<string, unknown> | null;
  created_at: string;
};

export type ProteinScanFeedback = {
  id: string;
  user_id: string;
  meal_log_id: string | null;
  corrected_food_name: string | null;
  corrected_protein_g: number | null;
  created_at: string;
};

export type ProteinBadge = {
  id: string;
  label: string;
  icon: string;
  earnedAt: string;
};

export type GamificationState = {
  xp: number;
  level: number;
  streak: number;
  lastLogDate: string | null;
  badges: ProteinBadge[];
  weeklyHeatmap: Record<string, number>;
};

export type ProteinSettings = {
  proteinGoal: number;
  darkMode: boolean;
  weightKg?: number | null;
  activityLevel?: ActivityLevel;
};

export type OfflineProteinState = {
  meals: ProteinMealLog[];
  gamification: GamificationState;
  settings: ProteinSettings;
  dailyScans: Record<string, number>;
  pendingSync: boolean;
};
