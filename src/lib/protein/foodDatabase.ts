import type { FoodCategory, FoodDatabaseEntry } from "./types";

const entry = (
  id: string,
  name: string,
  category: FoodCategory,
  proteinPer100g: number,
  aliases: string[] = [],
  typicalPortionG?: number,
): FoodDatabaseEntry => ({
  id,
  name,
  category,
  proteinPer100g,
  aliases,
  typicalPortionG,
});

export const FOOD_DATABASE: FoodDatabaseEntry[] = [
  // Poultry
  entry("chicken-breast", "Chicken breast", "poultry", 31, ["grilled chicken", "chicken fillet"], 150),
  entry("chicken-thigh", "Chicken thigh", "poultry", 26, ["chicken leg"], 120),
  entry("chicken-wing", "Chicken wing", "poultry", 23, ["wings"], 100),
  entry("turkey-breast", "Turkey breast", "poultry", 29, ["turkey"], 140),
  entry("duck-breast", "Duck breast", "poultry", 19, ["duck"], 130),
  // Meat
  entry("beef-steak", "Beef steak", "meat", 26, ["sirloin", "ribeye", "steak"], 170),
  entry("ground-beef", "Ground beef", "meat", 26, ["minced beef", "beef mince"], 120),
  entry("pork-chop", "Pork chop", "meat", 27, ["pork"], 150),
  entry("pork-sausage", "Pork sausage", "meat", 12, ["sausage"], 80),
  entry("bacon", "Bacon", "meat", 37, ["streaky bacon"], 40),
  entry("ham", "Ham", "meat", 18, ["sliced ham"], 60),
  entry("lamb-chop", "Lamb chop", "meat", 25, ["lamb"], 140),
  entry("venison", "Venison", "meat", 30, ["deer meat"], 150),
  // Fish & seafood
  entry("salmon", "Salmon", "fish", 20, ["smoked salmon", "salmon fillet"], 150),
  entry("tuna", "Tuna", "fish", 30, ["canned tuna", "tuna steak"], 120),
  entry("cod", "Cod", "fish", 18, ["white fish"], 140),
  entry("haddock", "Haddock", "fish", 19, [], 140),
  entry("mackerel", "Mackerel", "fish", 19, [], 130),
  entry("sardines", "Sardines", "fish", 25, ["canned sardines"], 90),
  entry("trout", "Trout", "fish", 20, [], 140),
  entry("prawns", "Prawns", "seafood", 24, ["shrimp"], 100),
  entry("crab", "Crab", "seafood", 19, ["crab meat"], 100),
  entry("mussels", "Mussels", "seafood", 24, [], 150),
  entry("scallops", "Scallops", "seafood", 20, [], 100),
  // Eggs & dairy
  entry("egg-whole", "Whole egg", "eggs", 13, ["fried egg", "boiled egg", "scrambled egg"], 50),
  entry("egg-white", "Egg white", "eggs", 11, ["egg whites"], 33),
  entry("greek-yogurt", "Greek yogurt", "dairy", 10, ["yogurt", "greek yoghurt"], 170),
  entry("natural-yogurt", "Natural yogurt", "dairy", 5, ["plain yogurt"], 150),
  entry("cottage-cheese", "Cottage cheese", "dairy", 11, ["cottage"], 150),
  entry("cheddar-cheese", "Cheddar cheese", "dairy", 25, ["cheese", "cheddar"], 40),
  entry("mozzarella", "Mozzarella", "dairy", 22, ["mozzarella cheese"], 50),
  entry("feta-cheese", "Feta cheese", "dairy", 14, ["feta"], 50),
  entry("milk-whole", "Whole milk", "dairy", 3.3, ["milk"], 250),
  entry("milk-skim", "Skim milk", "dairy", 3.4, ["skimmed milk"], 250),
  entry("protein-shake", "Protein shake", "supplements", 80, ["whey shake", "protein powder"], 300),
  entry("protein-bar", "Protein bar", "supplements", 30, ["energy bar"], 60),
  // Legumes
  entry("lentils-cooked", "Lentils cooked", "legumes", 9, ["lentils", "dal"], 180),
  entry("chickpeas-cooked", "Chickpeas cooked", "legumes", 9, ["chickpeas", "hummus base"], 150),
  entry("black-beans", "Black beans", "legumes", 9, ["beans"], 150),
  entry("kidney-beans", "Kidney beans", "legumes", 9, [], 150),
  entry("tofu-firm", "Tofu firm", "legumes", 17, ["tofu"], 150),
  entry("tempeh", "Tempeh", "legumes", 19, [], 100),
  entry("edamame", "Edamame", "legumes", 11, ["soy beans"], 100),
  entry("peanut-butter", "Peanut butter", "legumes", 25, ["pb"], 32),
  // Grains
  entry("rice-white-cooked", "White rice cooked", "grains", 2.7, ["rice", "steamed rice"], 180),
  entry("rice-brown-cooked", "Brown rice cooked", "grains", 2.6, ["brown rice"], 180),
  entry("quinoa-cooked", "Quinoa cooked", "grains", 4.4, ["quinoa"], 185),
  entry("oats-cooked", "Oats cooked", "grains", 2.5, ["porridge", "oatmeal"], 250),
  entry("pasta-cooked", "Pasta cooked", "grains", 5, ["spaghetti", "penne"], 200),
  entry("bread-wholemeal", "Wholemeal bread", "grains", 13, ["bread", "toast"], 40),
  entry("bagel", "Bagel", "grains", 10, [], 90),
  entry("couscous-cooked", "Couscous cooked", "grains", 3.8, ["couscous"], 180),
  entry("bulgur-cooked", "Bulgur cooked", "grains", 3.1, ["bulgur wheat"], 180),
  // Vegetables
  entry("broccoli", "Broccoli", "vegetables", 2.8, ["steamed broccoli"], 150),
  entry("spinach", "Spinach", "vegetables", 2.9, ["leafy greens"], 80),
  entry("kale", "Kale", "vegetables", 4.3, [], 80),
  entry("peas", "Peas", "vegetables", 5.4, ["green peas"], 80),
  entry("sweet-potato", "Sweet potato", "vegetables", 1.6, ["sweet potato"], 150),
  entry("potato-baked", "Baked potato", "vegetables", 2.5, ["potato"], 200),
  entry("mushrooms", "Mushrooms", "vegetables", 3.1, ["button mushrooms"], 100),
  entry("asparagus", "Asparagus", "vegetables", 2.2, [], 120),
  entry("cauliflower", "Cauliflower", "vegetables", 1.9, [], 150),
  entry("avocado", "Avocado", "fruits", 2, ["avocado toast topping"], 100),
  // Fruits
  entry("banana", "Banana", "fruits", 1.1, [], 120),
  entry("apple", "Apple", "fruits", 0.3, [], 180),
  entry("berries-mixed", "Mixed berries", "fruits", 1.2, ["berries", "strawberries"], 100),
  entry("orange", "Orange", "fruits", 0.9, [], 150),
  entry("mango", "Mango", "fruits", 0.8, [], 150),
  // Nuts & seeds
  entry("almonds", "Almonds", "nuts", 21, ["almond"], 30),
  entry("walnuts", "Walnuts", "nuts", 15, [], 30),
  entry("cashews", "Cashews", "nuts", 18, [], 30),
  entry("peanuts", "Peanuts", "nuts", 26, [], 30),
  entry("chia-seeds", "Chia seeds", "nuts", 17, ["chia"], 15),
  entry("pumpkin-seeds", "Pumpkin seeds", "nuts", 30, ["pepitas"], 15),
  // Snacks & prepared
  entry("hummus", "Hummus", "snacks", 8, [], 60),
  entry("trail-mix", "Trail mix", "snacks", 14, ["nuts mix"], 40),
  entry("granola", "Granola", "snacks", 10, [], 50),
  entry("beef-jerky", "Beef jerky", "snacks", 33, ["jerky"], 30),
  entry("sushi-salmon", "Salmon sushi", "snacks", 9, ["sushi", "nigiri"], 120),
  entry("burrito-chicken", "Chicken burrito", "snacks", 12, ["burrito"], 350),
  entry("pizza-slice", "Pizza slice", "snacks", 12, ["pizza"], 120),
  entry("burger-beef", "Beef burger", "snacks", 17, ["burger"], 200),
  entry("fish-fingers", "Fish fingers", "snacks", 11, ["fish sticks"], 120),
  // Desserts
  entry("chocolate-cake", "Chocolate cake", "desserts", 5, ["cake", "slice of cake"], 80),
  entry("cheesecake", "Cheesecake", "desserts", 6, [], 100),
  entry("ice-cream", "Ice cream", "desserts", 3.5, [], 100),
  entry("brownie", "Brownie", "desserts", 5, [], 60),
  entry("cookie", "Cookie", "desserts", 6, ["biscuit"], 30),
  entry("donut", "Donut", "desserts", 5, ["doughnut"], 60),
  entry("muffin", "Muffin", "desserts", 5, [], 80),
  entry("pancakes", "Pancakes", "desserts", 6, ["pancake stack"], 200),
  entry("waffles", "Waffles", "desserts", 7, [], 90),
  entry("croissant", "Croissant", "desserts", 8, [], 60),
];

const aliasIndex = new Map<string, FoodDatabaseEntry>();

function normalizeFoodKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

for (const food of FOOD_DATABASE) {
  aliasIndex.set(normalizeFoodKey(food.name), food);
  for (const alias of food.aliases) {
    aliasIndex.set(normalizeFoodKey(alias), food);
  }
}

export function lookupFood(name: string): FoodDatabaseEntry | null {
  const key = normalizeFoodKey(name);
  if (aliasIndex.has(key)) return aliasIndex.get(key)!;

  for (const [aliasKey, food] of aliasIndex.entries()) {
    if (key.includes(aliasKey) || aliasKey.includes(key)) return food;
  }
  return null;
}

export function estimateProteinFromDatabase(name: string, portionGrams?: number): {
  food: FoodDatabaseEntry;
  portionGrams: number;
  proteinGrams: number;
} | null {
  const food = lookupFood(name);
  if (!food) return null;

  const portion = portionGrams && portionGrams > 0 ? portionGrams : food.typicalPortionG ?? 100;
  const proteinGrams = Math.round((food.proteinPer100g * portion) / 10) / 10;
  return { food, portionGrams: portion, proteinGrams };
}

export function validateFoodAgainstDatabase(
  name: string,
  aiProteinGrams: number,
  portionGrams?: number,
): { adjustedProteinGrams: number; confidenceBoost: number; matched: boolean } {
  const estimate = estimateProteinFromDatabase(name, portionGrams);
  if (!estimate) {
    return { adjustedProteinGrams: aiProteinGrams, confidenceBoost: 0, matched: false };
  }

  const { proteinGrams } = estimate;
  const delta = Math.abs(aiProteinGrams - proteinGrams);
  const tolerance = Math.max(5, proteinGrams * 0.35);

  if (delta <= tolerance) {
    const blended = Math.round(((aiProteinGrams + proteinGrams) / 2) * 10) / 10;
    return { adjustedProteinGrams: blended, confidenceBoost: 0.1, matched: true };
  }

  return { adjustedProteinGrams: proteinGrams, confidenceBoost: 0.15, matched: true };
}

export const FOOD_DATABASE_STATS = {
  itemCount: FOOD_DATABASE.length,
  categories: [...new Set(FOOD_DATABASE.map((f) => f.category))],
};
