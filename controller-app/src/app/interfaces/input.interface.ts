export interface CarInput {
  steer: 'LEFT' | 'RIGHT' | 'CENTER';
}

export interface PedalInput {
  type: 'GAS' | 'BRAKE';
  isDown: boolean;
}
