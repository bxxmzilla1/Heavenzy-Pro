
export interface TransformationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: number;
}

export interface Preset {
  id: string;
  name: string;
  prompt: string;
  icon: string;
}
