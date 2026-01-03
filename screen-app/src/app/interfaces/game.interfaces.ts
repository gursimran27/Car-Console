export interface CarInput {
  steer: 'LEFT' | 'RIGHT' | 'CENTER';
}

export interface PedalInput {
  type: 'GAS' | 'BRAKE';
  isDown: boolean;
}

export interface Obstacle {
  id: number;
  x: number; // % horizontal
  y: number; // % vertical (0 top, 100 bottom)
  width: number; // %
  height: number; // % (visual height ref)
  type: string;
}
