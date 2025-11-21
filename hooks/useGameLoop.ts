
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GRAVITY, FRICTION, ACCELERATION, MAX_SPEED, JUMP_FORCE, 
  TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT, BOUNCE_FORCE,
  GENERATE_LEVEL, SPRITES, COLORS
} from '../constants';
import { GameState, Entity, EntityType, TileType, Particle, Decoration } from '../types';
import { AudioEngine } from '../utils/audio';
import { parseLevel, LevelData } from '../utils/levelParser';

export const useGameLoop = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  // We use a ref for the game state to avoid re-renders on every frame
  const gameState = useRef<GameState>({
    mario: {
      id: 0, type: EntityType.MARIO, x: 32, y: 192, vx: 0, vy: 0, width: 12, height: 16, dead: false,
      grounded: false, big: false, invulnerable: 0, frame: 0, flip: false, animTimer: 0, coyoteTime: 0
    },
    camera: { x: 0 },
    entities: [],
    particles: [],
    decorations: [],
    score: 0,
    coins: 0,
    lives: 3,
    level: 1,
    time: 400,
    inputs: { left: false, right: false, up: false, down: false, jump: false, run: false },
    tiles: GENERATE_LEVEL(),
    status: 'MENU'
  });

  // Keep a backup of the initial level to reset to
  const initialLevelData = useRef<LevelData | null>(null);

  const generateDecorations = (width: number) => {
    const decorations: Decoration[] = [];
    for(let i=0; i<width; i+= Math.floor(Math.random() * 10) + 5) {
       if (Math.random() > 0.7) {
          decorations.push({ id: Math.random(), type: 'CLOUD', x: i * TILE_SIZE, y: Math.random() * 100 + 20 });
       }
    }
    for(let i=0; i<width; i+= Math.floor(Math.random() * 15) + 10) {
      if (Math.random() > 0.6) {
         decorations.push({ id: Math.random(), type: 'HILL', x: i * TILE_SIZE, y: 180 });
      }
    }
    for(let i=0; i<width; i+= Math.floor(Math.random() * 12) + 8) {
       if (Math.random() > 0.6) {
          decorations.push({ id: Math.random(), type: 'BUSH', x: i * TILE_SIZE, y: 208 });
       }
    }
    return decorations;
  }

  // Initialize Default Level Entities
  useEffect(() => {
    const defaultTiles = GENERATE_LEVEL();
    const defaultEntities: Entity[] = [
      { x: 22 * 16, y: 192 },
      { x: 40 * 16, y: 192 },
      { x: 50 * 16, y: 192 },
      { x: 52 * 16, y: 192 },
    ].map((g, i) => ({
      id: i + 1,
      type: EntityType.GOOMBA,
      x: g.x,
      y: g.y,
      vx: -0.5,
      vy: 0,
      width: 16,
      height: 16,
      dead: false,
      frame: 0,
      flip: false,
      animTimer: 0
    }));

    // Add a Koopa for testing
    defaultEntities.push({
      id: 99, type: EntityType.KOOPA, x: 30 * 16, y: 184, vx: -0.5, vy: 0,
      width: 16, height: 24, dead: false, frame: 0, flip: false, animTimer: 0, state: 'walking'
    });

    const decorations = generateDecorations(defaultTiles[0].length);

    initialLevelData.current = {
       tiles: defaultTiles,
       entities: defaultEntities,
       marioStart: { x: 32, y: 192 }
    };

    gameState.current.entities = JSON.parse(JSON.stringify(defaultEntities));
    gameState.current.decorations = decorations;
  }, []);

  const resetGame = useCallback(() => {
    const data = initialLevelData.current;
    if (!data) return;

    gameState.current.mario.x = data.marioStart.x;
    gameState.current.mario.y = data.marioStart.y;
    gameState.current.mario.vx = 0;
    gameState.current.mario.vy = 0;
    gameState.current.mario.dead = false;
    gameState.current.mario.big = false;
    gameState.current.mario.height = 16;
    gameState.current.camera.x = 0;
    gameState.current.score = 0;
    gameState.current.coins = 0;
    gameState.current.time = 400;
    gameState.current.status = 'PLAYING'; // Auto-start on reset if called from game over
    gameState.current.particles = [];
    gameState.current.tiles = JSON.parse(JSON.stringify(data.tiles)); // Deep copy to restore broken bricks
    gameState.current.entities = JSON.parse(JSON.stringify(data.entities));
    gameState.current.decorations = generateDecorations(data.tiles[0].length);
  }, []);

  const loadLevel = useCallback((ascii: string) => {
    const data = parseLevel(ascii);
    initialLevelData.current = data;
    
    gameState.current.tiles = data.tiles;
    gameState.current.entities = JSON.parse(JSON.stringify(data.entities));
    gameState.current.mario.x = data.marioStart.x;
    gameState.current.mario.y = data.marioStart.y;
    gameState.current.mario.vx = 0;
    gameState.current.mario.vy = 0;
    gameState.current.camera.x = 0;
    gameState.current.decorations = generateDecorations(data.tiles[0].length);
    gameState.current.status = 'MENU'; // Go to menu to let user start
  }, []);

  const startGame = useCallback(() => {
    gameState.current.status = 'PLAYING';
    AudioEngine.init();
  }, []);
  
  // Expose status for UI
  const [gameStatus, setGameStatus] = useState<string>('MENU');
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.current.status === 'MENU') return; // Handled by UI now
      
      if(gameState.current.status === 'GAMEOVER' || gameState.current.status === 'WIN') {
         if(e.code === 'KeyR') resetGame();
         return;
      }

      switch(e.code) {
        case 'ArrowLeft': gameState.current.inputs.left = true; break;
        case 'ArrowRight': gameState.current.inputs.right = true; break;
        case 'ArrowUp': gameState.current.inputs.up = true; break;
        case 'ArrowDown': gameState.current.inputs.down = true; break;
        case 'KeyZ': 
        case 'Space':
          if (!gameState.current.inputs.jump && (gameState.current.mario.grounded || gameState.current.mario.coyoteTime > 0)) {
            gameState.current.mario.vy = JUMP_FORCE;
            gameState.current.mario.grounded = false;
            gameState.current.mario.coyoteTime = 0;
            AudioEngine.playJump();
          }
          gameState.current.inputs.jump = true; 
          break;
        case 'KeyX': gameState.current.inputs.run = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'ArrowLeft': gameState.current.inputs.left = false; break;
        case 'ArrowRight': gameState.current.inputs.right = false; break;
        case 'ArrowUp': gameState.current.inputs.up = false; break;
        case 'ArrowDown': gameState.current.inputs.down = false; break;
        case 'KeyZ': 
        case 'Space':
          gameState.current.inputs.jump = false; 
          if (gameState.current.mario.vy < -3) gameState.current.mario.vy = -3; 
          break;
        case 'KeyX': gameState.current.inputs.run = false; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Collision Helpers
    const checkTile = (x: number, y: number) => {
      const tx = Math.floor(x / TILE_SIZE);
      const ty = Math.floor(y / TILE_SIZE);
      if (ty < 0 || ty >= 15 || tx < 0 || tx >= gameState.current.tiles[0].length) return TileType.AIR;
      return gameState.current.tiles[ty][tx];
    };

    const setTile = (x: number, y: number, type: number) => {
      const tx = Math.floor(x / TILE_SIZE);
      const ty = Math.floor(y / TILE_SIZE);
      if (ty >= 0 && ty < 15 && tx >= 0 && tx < gameState.current.tiles[0].length) {
        gameState.current.tiles[ty][tx] = type;
      }
    };
    
    const createDebris = (x: number, y: number, vx: number, vy: number): Particle => ({
       id: Math.random(), type: EntityType.PARTICLE, x, y, vx, vy, 
       width: 8, height: 8, dead: false, frame: 0, flip: false, life: 60, 
       color: COLORS.BRICK, sprite: SPRITES.BRICK_DEBRIS
    });

    const createDust = (x: number, y: number) => {
       gameState.current.particles.push({
          id: Math.random(), type: EntityType.DUST, x: x - 4, y: y - 8,
          vx: 0, vy: 0, width: 8, height: 8, dead: false, frame: 0, flip: false, life: 20,
          color: '#FFF', sprite: SPRITES.DUST
       });
    };

    const resolveMapCollision = (entity: Entity) => {
      let nextX = entity.x + entity.vx;
      if (entity.vx > 0) {
        if (checkTile(nextX + entity.width, entity.y) || checkTile(nextX + entity.width, entity.y + entity.height - 1)) {
           if (entity.type === EntityType.KOOPA && entity.state === 'shell_slide') {
              entity.vx = -entity.vx; // Bounce shell
              AudioEngine.playKick();
              return; // Skip pos adjustment to avoid stuck? 
           } else if (entity.type === EntityType.KOOPA || entity.type === EntityType.GOOMBA || entity.type === EntityType.MUSHROOM) {
              entity.vx *= -1;
           } else {
              entity.vx = 0;
           }
           nextX = Math.floor((nextX + entity.width) / TILE_SIZE) * TILE_SIZE - entity.width - 0.1;
        }
      } else if (entity.vx < 0) {
        if (checkTile(nextX, entity.y) || checkTile(nextX, entity.y + entity.height - 1)) {
           if (entity.type === EntityType.KOOPA && entity.state === 'shell_slide') {
              entity.vx = -entity.vx; // Bounce shell
              AudioEngine.playKick();
              return;
           } else if (entity.type === EntityType.KOOPA || entity.type === EntityType.GOOMBA || entity.type === EntityType.MUSHROOM) {
              entity.vx *= -1;
           } else {
              entity.vx = 0;
           }
           nextX = (Math.floor(nextX / TILE_SIZE) + 1) * TILE_SIZE + 0.1;
        }
      }
      entity.x = nextX;

      let nextY = entity.y + entity.vy;
      const wasGrounded = entity.grounded;
      entity.grounded = false;
      
      if (entity.vy > 0) {
        // Check feet
        if (checkTile(entity.x, nextY + entity.height) || checkTile(entity.x + entity.width - 0.1, nextY + entity.height)) {
           entity.vy = 0;
           entity.grounded = true;
           nextY = Math.floor((nextY + entity.height) / TILE_SIZE) * TILE_SIZE - entity.height;
           
           // Landing Dust
           if (!wasGrounded && entity.type === EntityType.MARIO && entity.vy > 2) {
              createDust(entity.x + entity.width/2, nextY + entity.height);
           }
        }
      } else if (entity.vy < 0) {
        // Check head
        const t1 = checkTile(entity.x, nextY);
        const t2 = checkTile(entity.x + entity.width - 0.1, nextY);
        if (t1 || t2) {
           entity.vy = 0;
           nextY = (Math.floor(nextY / TILE_SIZE) + 1) * TILE_SIZE;
           if (entity.type === EntityType.MARIO) {
              const cx = entity.x + entity.width/2;
              const cy = nextY - 1;
              const tile = checkTile(cx, cy);
              
              if (tile === TileType.QUESTION_BLOCK) {
                setTile(cx, cy, TileType.USED_BLOCK);
                // 50% Chance for Mushroom vs Coin
                if (Math.random() > 0.5 && !gameState.current.mario.big) {
                   gameState.current.entities.push({
                      id: Math.random(), type: EntityType.MUSHROOM, x: Math.floor(cx/16)*16, y: (Math.floor(cy/16)-1)*16,
                      vx: 1, vy: 0, width: 16, height: 16, dead: false, frame: 0, flip: false, grounded: false
                   });
                   AudioEngine.playPowerUp();
                } else {
                   gameState.current.coins++;
                   gameState.current.score += 200;
                   AudioEngine.playCoin();
                   gameState.current.particles.push({
                     id: Math.random(), type: EntityType.COIN, x: Math.floor(cx/16)*16 + 3, y: (Math.floor(cy/16)-1)*16,
                     vx: 0, vy: -4, width: 10, height: 14, dead: false, frame: 0, flip: false, life: 20, color: '#FFD700'
                   });
                }
              } else if (tile === TileType.BRICK) {
                if (gameState.current.mario.big) {
                   setTile(cx, cy, TileType.AIR);
                   AudioEngine.playBreak();
                   gameState.current.particles.push(createDebris(cx, cy, -2, -5));
                   gameState.current.particles.push(createDebris(cx, cy, 2, -5));
                   gameState.current.particles.push(createDebris(cx, cy, -2, -3));
                   gameState.current.particles.push(createDebris(cx, cy, 2, -3));
                } else {
                   AudioEngine.playStomp(); // Just a bump sound
                }
              }
           }
        }
      }
      entity.y = nextY;
      
      // Coyote Time Logic
      if (entity.type === EntityType.MARIO) {
         if (wasGrounded && !entity.grounded && entity.vy >= 0) {
             (entity as any).coyoteTime = 6;
         }
         if ((entity as any).coyoteTime > 0) (entity as any).coyoteTime--;
      }
    };

    const update = () => {
      if (gameState.current.status !== 'PLAYING') return;

      const mario = gameState.current.mario;
      if (mario.invulnerable > 0) mario.invulnerable--;
      
      const levelWidthPix = gameState.current.tiles[0].length * TILE_SIZE;

      if (mario.y > SCREEN_HEIGHT + 32) {
        mario.dead = true;
        gameState.current.status = 'GAMEOVER';
        AudioEngine.playDie();
      }

      // Win Condition
      if (mario.x > levelWidthPix - 120) {
         gameState.current.status = 'WIN';
         AudioEngine.playCoin(); // Placeholder for win sound
      }

      if (gameState.current.inputs.right) {
        if (mario.vx < MAX_SPEED) mario.vx += ACCELERATION;
        mario.flip = false;
      } else if (gameState.current.inputs.left) {
        if (mario.vx > -MAX_SPEED) mario.vx -= ACCELERATION;
        mario.flip = true;
      } else {
        mario.vx *= FRICTION;
      }
      if (Math.abs(mario.vx) < 0.1) mario.vx = 0;
      mario.vy += GRAVITY;
      resolveMapCollision(mario);
      
      // Camera Follow
      if (mario.x > gameState.current.camera.x + 100) {
        gameState.current.camera.x = mario.x - 100;
      }
      if (gameState.current.camera.x < 0) gameState.current.camera.x = 0;
      if (gameState.current.camera.x > levelWidthPix - SCREEN_WIDTH) gameState.current.camera.x = levelWidthPix - SCREEN_WIDTH;
      
      gameState.current.entities.forEach(entity => {
        if (entity.dead) return;
        if (entity.x - gameState.current.camera.x < SCREEN_WIDTH + 64 && entity.x > gameState.current.camera.x - 64) {
          entity.vy += GRAVITY;
          resolveMapCollision(entity); // Apply physics to all entities
          entity.animTimer = (entity.animTimer || 0) + 1;
          
          // Entity specific logic: Koopa Shell Collisions with other enemies
          if (entity.type === EntityType.KOOPA && entity.state === 'shell_slide') {
               // Check collision with other entities
               gameState.current.entities.forEach(target => {
                  if (target !== entity && !target.dead) {
                      const dx = Math.abs((entity.x + entity.width/2) - (target.x + target.width/2));
                      const dy = Math.abs((entity.y + entity.height/2) - (target.y + target.height/2));
                      
                      if (dx < (entity.width + target.width) / 2 && dy < (entity.height + target.height) / 2) {
                          if (target.type === EntityType.GOOMBA || target.type === EntityType.KOOPA) {
                              target.dead = true;
                              target.vy = -4; // Fly off
                              target.vx = entity.vx > 0 ? 2 : -2;
                              gameState.current.score += 100;
                              AudioEngine.playKick();
                          }
                      }
                  }
               });
          }

          // Mario Interactions
          if (mario.x < entity.x + entity.width && mario.x + mario.width > entity.x &&
              mario.y < entity.y + entity.height && mario.y + mario.height > entity.y) {
                
                if (entity.type === EntityType.MUSHROOM) {
                    entity.dead = true;
                    mario.big = true;
                    mario.height = 32;
                    mario.y -= 16;
                    gameState.current.score += 1000;
                    AudioEngine.playPowerUp();
                }
                else if (entity.type === EntityType.GOOMBA) {
                    if (mario.vy > 0 && mario.y + mario.height < entity.y + 8) {
                       entity.dead = true;
                       mario.vy = BOUNCE_FORCE;
                       gameState.current.score += 100;
                       AudioEngine.playStomp();
                       gameState.current.particles.push({
                         id: Math.random(), type: EntityType.PARTICLE, x: entity.x, y: entity.y,
                         vx: 0, vy: 0, width: 16, height: 16, dead: false, frame: 0, flip: false, life: 30, 
                         color: COLORS.GOOMBA_BROWN, sprite: SPRITES.GOOMBA_FLAT
                       });
                    } else if (mario.invulnerable <= 0) {
                       if (mario.big) {
                          mario.big = false;
                          mario.height = 16;
                          mario.y += 16;
                          mario.invulnerable = 60;
                          AudioEngine.playBreak();
                       } else {
                          mario.dead = true;
                          mario.vy = -5;
                          gameState.current.status = 'GAMEOVER';
                          AudioEngine.playDie();
                       }
                    }
                }
                else if (entity.type === EntityType.KOOPA) {
                   if (entity.state === 'walking') {
                      if (mario.vy > 0 && mario.y + mario.height < entity.y + 12) {
                         entity.state = 'shell_idle';
                         entity.vx = 0;
                         // Visual adjustment: center the shell on the koopa's pos
                         entity.height = 16; 
                         entity.y += 8; // Drop down
                         mario.vy = BOUNCE_FORCE;
                         AudioEngine.playStomp();
                      } else if (mario.invulnerable <= 0) {
                          if (mario.big) {
                              mario.big = false;
                              mario.height = 16;
                              mario.y += 16;
                              mario.invulnerable = 60;
                              AudioEngine.playBreak();
                           } else {
                              mario.dead = true;
                              mario.vy = -5;
                              gameState.current.status = 'GAMEOVER';
                              AudioEngine.playDie();
                           }
                      }
                   } else if (entity.state === 'shell_idle') {
                      // Kick
                      const dir = mario.x < entity.x + (entity.width/2) ? 1 : -1;
                      entity.vx = dir * (MAX_SPEED + 2); // Fast kick
                      entity.state = 'shell_slide';
                      entity.x += dir * 4; // Push out slightly to avoid double hit
                      AudioEngine.playKick();
                      mario.invulnerable = 10; 
                   } else if (entity.state === 'shell_slide') {
                       if (mario.vy > 0 && mario.y + mario.height < entity.y + 8) {
                          entity.state = 'shell_idle';
                          entity.vx = 0;
                          mario.vy = BOUNCE_FORCE;
                          AudioEngine.playStomp();
                       } else if (mario.invulnerable <= 0) {
                          if (mario.big) {
                              mario.big = false;
                              mario.height = 16;
                              mario.y += 16;
                              mario.invulnerable = 60;
                              AudioEngine.playBreak();
                           } else {
                              mario.dead = true;
                              mario.vy = -5;
                              gameState.current.status = 'GAMEOVER';
                              AudioEngine.playDie();
                           }
                       }
                   }
                }
          }
        }
      });

      gameState.current.particles = gameState.current.particles.filter(p => p.life > 0);
      gameState.current.particles.forEach(p => {
        p.life--;
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === EntityType.PARTICLE) p.vy += GRAVITY;
      });

      mario.animTimer++;
      
      // Update React state occasionally or on event
      if (gameState.current.score !== score) setScore(gameState.current.score);
      if (gameState.current.status !== gameStatus) setGameStatus(gameState.current.status);
    };

    const drawCloud = (x: number, y: number) => {
        ctx.fillStyle = COLORS.CLOUD;
        ctx.fillRect(x, y, 16, 8);
        ctx.fillRect(x + 8, y - 8, 24, 8);
        ctx.fillRect(x + 16, y, 24, 8);
    };

    const drawBush = (x: number, y: number) => {
        ctx.fillStyle = COLORS.BUSH;
        ctx.fillRect(x, y + 8, 48, 16);
        ctx.fillRect(x + 8, y, 32, 16);
        ctx.fillRect(x + 16, y - 8, 16, 8);
    };

    const drawHill = (x: number, y: number) => {
         ctx.fillStyle = COLORS.HILL_DARK;
         ctx.fillRect(x+16, y, 16, 32);
         ctx.fillRect(x, y+16, 48, 16);
         ctx.fillStyle = COLORS.HILL_LIGHT;
         ctx.fillRect(x+18, y, 12, 32);
         ctx.fillRect(x+2, y+16, 44, 16);
    };

    const drawFlagPole = (x: number, y: number) => {
        // Pole
        ctx.fillStyle = COLORS.FLAG_POLE;
        ctx.fillRect(x + 6, y, 4, 160);
        ctx.fillStyle = COLORS.FLAG;
        // Simple flag triangle/rect
        ctx.fillRect(x + 10, y + 10, 20, 14);
        // Ball
        ctx.fillStyle = COLORS.FLAG_POLE;
        ctx.fillRect(x + 4, y - 4, 8, 8);
    };

    const draw = () => {
      ctx.fillStyle = COLORS.SKY;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      const camX = Math.floor(gameState.current.camera.x);
      
      // Draw Decorations
      gameState.current.decorations.forEach(d => {
         const dx = Math.floor(d.x - camX);
         if (dx < -100 || dx > SCREEN_WIDTH) return;
         if (d.type === 'CLOUD') drawCloud(dx, d.y);
         else if (d.type === 'BUSH') drawBush(dx, d.y);
         else if (d.type === 'HILL') drawHill(dx, d.y);
      });

      // Draw Flag Pole
      const levelWidthPix = gameState.current.tiles[0].length * TILE_SIZE;
      drawFlagPole(levelWidthPix - 100 - camX, 48);
      
      const drawSprite = (sprite: number[][], x: number, y: number, flip: boolean, palette: Record<number, string>) => {
         if (!sprite) return;
         const h = sprite.length;
         const w = sprite[0].length;
         for(let r=0; r<h; r++) {
            for(let c=0; c<w; c++) {
               const val = sprite[r][c];
               if(val === 0) continue;
               if(palette[val]) ctx.fillStyle = palette[val];
               else ctx.fillStyle = '#000';
               // Adjusted for flip being horizontal around center
               const drawX = flip ? Math.floor(x + w - 1 - c) : Math.floor(x + c);
               const drawY = Math.floor(y + r);
               ctx.fillRect(drawX, drawY, 1, 1);
            }
         }
      };

      // Updated Palettes
      const MARIO_PALETTE = { 
        1: COLORS.MARIO_RED, 
        2: COLORS.MARIO_SKIN, 
        3: COLORS.MARIO_BROWN, 
        4: COLORS.MARIO_BLUE, 
        5: COLORS.MARIO_YELLOW 
      }; 
      
      const GOOMBA_PALETTE = { 
        1: COLORS.GOOMBA_BROWN, 
        2: COLORS.GOOMBA_SKIN, 
        3: COLORS.GOOMBA_BLACK 
      };
      
      const KOOPA_PALETTE = { 
        1: COLORS.KOOPA_GREEN, 
        2: COLORS.KOOPA_SKIN, 
        3: COLORS.KOOPA_WHITE 
      };
      
      const MUSHROOM_PALETTE = { 1: COLORS.MUSHROOM_RED, 2: COLORS.MUSHROOM_SPOT };
      const BRICK_PALETTE = { 1: '#000', 2: COLORS.BRICK };
      const DUST_PALETTE = { 1: '#FFF' };

      const startCol = Math.floor(camX / TILE_SIZE);
      const endCol = startCol + (SCREEN_WIDTH / TILE_SIZE) + 1;

      for (let y = 0; y < 15; y++) {
        for (let x = startCol; x <= endCol; x++) {
           const tile = gameState.current.tiles[y] && gameState.current.tiles[y][x];
           if (tile) {
              const drawX = Math.floor(x * TILE_SIZE - camX);
              const drawY = y * TILE_SIZE;
              
              switch(tile) {
                case TileType.GROUND: ctx.fillStyle = COLORS.GROUND; break;
                case TileType.BRICK: ctx.fillStyle = COLORS.BRICK; break;
                case TileType.HARD_BLOCK: ctx.fillStyle = COLORS.BRICK; break;
                case TileType.QUESTION_BLOCK: ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? COLORS.BLOCK_Q : COLORS.GROUND; break;
                case TileType.USED_BLOCK: ctx.fillStyle = COLORS.GOOMBA_BROWN; break;
                case TileType.PIPE_L: case TileType.PIPE_R: case TileType.PIPE_TOP_L: case TileType.PIPE_TOP_R: ctx.fillStyle = COLORS.PIPE_LIGHT; break;
                default: ctx.fillStyle = '#000';
              }
              
              ctx.fillRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
              if (tile !== TileType.AIR) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.strokeRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
                if (tile === TileType.BRICK) {
                   ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Shadow
                   ctx.fillRect(drawX, drawY+3, 16, 1);
                   ctx.fillRect(drawX, drawY+11, 16, 1);
                   ctx.fillRect(drawX+7, drawY, 1, 3);
                   ctx.fillRect(drawX+3, drawY+4, 1, 7);
                   ctx.fillRect(drawX+11, drawY+4, 1, 7);
                   ctx.fillRect(drawX+7, drawY+12, 1, 4);
                }
                if (tile === TileType.QUESTION_BLOCK) {
                   ctx.fillStyle = '#b45c28'; // Shadow
                   ctx.fillRect(drawX, drawY, 16, 1); ctx.fillRect(drawX, drawY, 1, 16);
                   ctx.fillRect(drawX+15, drawY, 1, 16); ctx.fillRect(drawX, drawY+15, 16, 1);
                   ctx.fillStyle = '#000';
                   ctx.fillRect(drawX+7, drawY+10, 2, 2); ctx.fillRect(drawX+5, drawY+4, 6, 2);
                   ctx.fillRect(drawX+11, drawY+4, 2, 4); ctx.fillRect(drawX+7, drawY+7, 2, 2);
                }
                if (tile === TileType.PIPE_L || tile === TileType.PIPE_R || tile === TileType.PIPE_TOP_L || tile === TileType.PIPE_TOP_R) {
                   // Simple highlight
                   ctx.fillStyle = COLORS.PIPE_HIGHLIGHT;
                   ctx.fillRect(drawX+2, drawY, 2, 16);
                   ctx.fillStyle = COLORS.PIPE_DARK;
                   ctx.fillRect(drawX+8, drawY, 2, 16);
                }
              }
           }
        }
      }

      gameState.current.entities.forEach(e => {
        if (e.dead) return;
        if (e.x < camX - 32 || e.x > camX + SCREEN_WIDTH) return;
        const dx = Math.floor(e.x - camX);
        const dy = Math.floor(e.y);
        
        if (e.type === EntityType.GOOMBA) {
           const frame = Math.floor((e.animTimer || 0) / 10) % 2;
           const sprite = frame === 0 ? SPRITES.GOOMBA : SPRITES.GOOMBA_WALK2;
           drawSprite(sprite, dx, dy, false, GOOMBA_PALETTE);
        } else if (e.type === EntityType.KOOPA) {
           if (e.state === 'walking') {
             const frame = Math.floor((e.animTimer || 0) / 10) % 2;
             const sprite = frame === 0 ? SPRITES.KOOPA_1 : SPRITES.KOOPA_2;
             // Koopa is 24px tall.
             drawSprite(sprite, dx, dy, e.vx > 0, KOOPA_PALETTE);
           } else {
             drawSprite(SPRITES.KOOPA_SHELL, dx, dy, false, KOOPA_PALETTE);
           }
        } else if (e.type === EntityType.MUSHROOM) {
           drawSprite(SPRITES.MUSHROOM, dx, dy, false, MUSHROOM_PALETTE);
        }
      });
      
      gameState.current.particles.forEach(p => {
        const px = Math.floor(p.x - camX);
        const py = Math.floor(p.y);
        if (p.sprite) {
           let pal = p.palette;
           if (!pal) {
              if (p.sprite === SPRITES.BRICK_DEBRIS) pal = BRICK_PALETTE;
              else if (p.sprite === SPRITES.GOOMBA_FLAT) pal = GOOMBA_PALETTE;
              else if (p.sprite === SPRITES.DUST) pal = DUST_PALETTE;
           }
           if (pal) drawSprite(p.sprite, px, py, p.flip, pal);
        } else {
           ctx.fillStyle = p.color;
           ctx.fillRect(px, py, p.width, p.height);
        }
      });

      const m = gameState.current.mario;
      if (!m.dead || gameState.current.status === 'GAMEOVER') {
         const mx = Math.floor(m.x - camX);
         const my = Math.floor(m.y);
         
         let sprite = SPRITES.MARIO_IDLE;
         const isTurning = (m.vx > 0 && gameState.current.inputs.left) || (m.vx < 0 && gameState.current.inputs.right);

         if (m.big) {
             if (!m.grounded) {
                 sprite = SPRITES.BIG_MARIO_JUMP;
             } else if (isTurning) {
                 sprite = SPRITES.BIG_MARIO_TURN;
             } else if (Math.abs(m.vx) > 0.1) {
                 const runFrame = Math.floor(m.animTimer / 4) % 3;
                 if (runFrame === 0) sprite = SPRITES.BIG_MARIO_RUN_0;
                 else if (runFrame === 1) sprite = SPRITES.BIG_MARIO_RUN_1;
                 else sprite = SPRITES.BIG_MARIO_RUN_2;
             } else {
                 sprite = SPRITES.BIG_MARIO_IDLE;
             }
             
             // Flashing effect if invulnerable
             if (m.invulnerable <= 0 || Math.floor(m.invulnerable / 2) % 2 === 0) {
                 // Offset Y by 8 pixels because sprite is 24px tall but hitbox is 32px
                 drawSprite(sprite, mx, my + 8, m.flip, MARIO_PALETTE);
             }

         } else {
             if (!m.grounded) {
                 sprite = SPRITES.MARIO_JUMP;
             } else if (isTurning) {
                 sprite = SPRITES.MARIO_TURN;
             } else if (Math.abs(m.vx) > 0.1) {
                 const runFrame = Math.floor(m.animTimer / 4) % 3;
                 if (runFrame === 0) sprite = SPRITES.MARIO_RUN_1;
                 else if (runFrame === 1) sprite = SPRITES.MARIO_RUN_2;
                 else sprite = SPRITES.MARIO_RUN_3;
             } else {
                 sprite = SPRITES.MARIO_IDLE;
             }

             // Flashing effect if invulnerable
             if (m.invulnerable <= 0 || Math.floor(m.invulnerable / 2) % 2 === 0) {
                 drawSprite(sprite, mx - 2, my, m.flip, MARIO_PALETTE);
             }
         }
      }

      // Minimal HUD
      ctx.fillStyle = '#FFF';
      ctx.font = '8px "Press Start 2P"';
      ctx.fillText(`MARIO`, 20, 20);
      ctx.fillText(`${gameState.current.score.toString().padStart(6, '0')}`, 20, 30);
      ctx.fillText(`WORLD`, 140, 20);
      ctx.fillText(`1-1`, 148, 30);
      ctx.fillText(`TIME`, 200, 20);
      ctx.fillText(`${Math.floor(gameState.current.time/60)}`, 208, 30);
      ctx.fillText(`COINS`, 90, 20);
      ctx.fillText(`${gameState.current.coins}`, 100, 30);
    };

    const loop = (timestamp: number) => {
       const deltaTime = timestamp - lastTime;
       if (deltaTime > 16) { 
          update();
          draw();
          lastTime = timestamp;
       }
       animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    }
  }, [resetGame, loadLevel]); // Dependencies for effect re-run if controls change

  return {
    status: gameStatus,
    score,
    startGame,
    resetGame,
    loadLevel
  };
};
