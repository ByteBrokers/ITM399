export interface QuestionnaireData {
  name: string;
  age: string;
  location: string;
  occupation: string;
  devices?: string[];
  social_media?: string[];
  screen_time?: string;
  shopping_freq?: string;
  shopping_categories?: string[];
  fitness?: string;
  interests?: string;
  privacy_concern?: string;
  data_sharing?: string;
  email?: string;
}

export interface CharacterCustomizationData {
  body_color: string;
  skin_color: string;
  height: number;
  width: number;
  facial_expression?: string;
  shirt_pattern?: string;
}

export interface DataType {
  value: number;
  owned: boolean;
  lastCollectedTime?: number;
}

export interface GameStateData {
  coins: number;
  level: number;
  exp: number;
  data_types: Record<string, DataType>;
}

export interface Company {
  name: string;
  color: number;
  interests: string[];
  multiplier: number;
  description: string;
}
