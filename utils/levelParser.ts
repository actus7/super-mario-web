
import { TileType, EntityType, Entity } from '../types';
import { TILE_SIZE, SPRITES } from '../constants';

export interface LevelData {
  tiles: number[][];
  entities: Entity[];
  marioStart: { x: number; y: number };
}

export const parseLevel = (ascii: string): LevelData => {
  const rows = ascii.split('\n').filter(r => r.length > 0);
  const height = 15; // Fixed height
  const width = Math.max(...rows.map(r => r.length));

  const tiles: number[][] = Array(height).fill(0).map(() => Array(width).fill(TileType.AIR));
  const entities: Entity[] = [];
  let marioStart = { x: 32, y: 192 };

  let entityIdCounter = 1;

  rows.forEach((row, y) => {
    if (y >= height) return;
    
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      const currentY = y;
      const currentX = x;

      switch (char) {
        case 'G': tiles[y][x] = TileType.GROUND; break;
        case 'B': tiles[y][x] = TileType.BRICK; break;
        case '?': tiles[y][x] = TileType.QUESTION_BLOCK; break;
        case '#': tiles[y][x] = TileType.HARD_BLOCK; break;
        case '{': tiles[y][x] = TileType.PIPE_TOP_L; break;
        case '}': tiles[y][x] = TileType.PIPE_TOP_R; break;
        case '[': tiles[y][x] = TileType.PIPE_L; break;
        case ']': tiles[y][x] = TileType.PIPE_R; break;
        case 'M': 
          marioStart = { x: x * TILE_SIZE, y: y * TILE_SIZE };
          tiles[y][x] = TileType.AIR;
          break;
        case 'e':
          entities.push({
            id: entityIdCounter++,
            type: EntityType.GOOMBA,
            x: x * TILE_SIZE,
            y: y * TILE_SIZE,
            vx: -0.5,
            vy: 0,
            width: 16,
            height: 16,
            dead: false,
            frame: 0,
            flip: false,
            animTimer: 0
          });
          tiles[y][x] = TileType.AIR;
          break;
        case 'k':
          entities.push({
            id: entityIdCounter++,
            type: EntityType.KOOPA,
            x: x * TILE_SIZE,
            y: (y * TILE_SIZE) - 8, // Koopas are taller (24px visual, hitbox 16)
            vx: -0.5,
            vy: 0,
            width: 16,
            height: 24,
            dead: false,
            frame: 0,
            flip: false,
            animTimer: 0,
            state: 'walking'
          });
          tiles[y][x] = TileType.AIR;
          break;
        default: 
          tiles[y][x] = TileType.AIR;
      }
    }
  });

  return { tiles, entities, marioStart };
};