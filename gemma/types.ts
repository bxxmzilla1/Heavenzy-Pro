export interface ClothingOption {
  id: string;
  label: string;
  description: string;
}

export interface GenerationConfig {
  clothing: ClothingOption;
  lighting: string;
  ethnicity: string;
  skinTone: number; // 0-100
  eyeColor: string;
  eyeShape: string;
  hairStyle: string;
  hairColor: string;
  noseShape: string;
  mouthShape: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  config: GenerationConfig;
}

export const CLOTHING_OPTIONS: ClothingOption[] = [
  { id: 'brown-tank', label: 'Brown Tank Top', description: 'a simple brown tank top' },
  { id: 'gray-lace', label: 'Gray Lace Top', description: 'a gray top with delicate lace details' },
  { id: 'black-crop', label: 'Black Crop Top', description: 'a plain black crop top' },
  { id: 'white-fitted', label: 'White Fitted Tank', description: 'a white fitted tank top' },
  { id: 'denim-jacket', label: 'Denim Jacket', description: 'a classic blue denim jacket over a white tee' },
  { id: 'turtle-neck', label: 'Black Turtleneck', description: 'a sleek black sleeveless turtleneck' },
];

export const LIGHTING_OPTIONS = [
  'Studio Lighting',
  'Soft Natural Light',
  'Dramatic Rim Light',
  'Cinematic Lighting',
  'Golden Hour'
];

export const ETHNICITY_OPTIONS = [
  'Caucasian',
  'Asian',
  'Latina',
  'Black/African',
  'Middle Eastern',
  'South Asian',
  'Mixed Race'
];

export const EYE_COLOR_OPTIONS = [
  'Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber'
];

export const EYE_SHAPE_OPTIONS = [
  'Almond', 'Round', 'Monolid', 'Hooded', 'Upturned', 'Downturned'
];

export const HAIR_STYLE_OPTIONS = [
  'Straight Long', 'Wavy Loose', 'Curly', 'Coily/Afro', 'Bob Cut', 'Pixie Cut', 'Braids', 'Ponytail'
];

export const HAIR_COLOR_OPTIONS = [
  'Black', 'Dark Brown', 'Medium Brown', 'Blonde', 'Platinum', 'Red/Ginger', 'Auburn', 'Pastel Pink'
];

export const NOSE_SHAPE_OPTIONS = [
  'Straight', 'Button', 'Roman', 'Nubian', 'Snub', 'Hawk'
];

export const MOUTH_SHAPE_OPTIONS = [
  'Full Lips', 'Thin Lips', 'Bow-shaped', 'Heart-shaped', 'Round'
];