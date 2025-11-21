
export enum EntityType {
  MARIO = 'MARIO',
  GOOMBA = 'GOOMBA',
  KOOPA = 'KOOPA',
  SHELL = 'SHELL',
  MUSHROOM = 'MUSHROOM',
  PARTICLE = 'PARTICLE',
  COIN = 'COIN',
  DUST = 'DUST'
}

export enum TileType {
  AIR = 0,
  GROUND = 1,
  BRICK = 2,
  HARD_BLOCK = 3,
  QUESTION_BLOCK = 4,
  PIPE_L = 5,
  PIPE_R = 6,
  PIPE_TOP_L = 7,
  PIPE_TOP_R = 8,
  USED_BLOCK = 9,
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Decoration {
  id: number;
  type: 'CLOUD' | 'BUSH' | 'HILL';
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  dead: boolean;
  frame: number;
  flip: boolean;
  state?: string; // e.g. 'idle', 'run', 'jump', 'shell_idle', 'shell_slide'
  timer?: number;
  grounded?: boolean;
  animTimer?: number;
}

export interface Particle extends Entity {
  life: number;
  color: string;
  sprite?: number[][];
  palette?: Record<number, string>;
}

export interface GameState {
  mario: Entity & {
    grounded: boolean;
    big: boolean;
    invulnerable: number;
    animTimer: number;
    coyoteTime: number;
  };
  camera: { x: number };
  entities: Entity[];
  particles: Particle[];
  decorations: Decoration[];
  score: number;
  coins: number;
  lives: number;
  level: number;
  time: number;
  inputs: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    run: boolean;
  };
  tiles: number[][];
  status: 'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN';
}