# TRON Game

A modern implementation of the classic TRON light cycle game using Phaser 3.

## Description

This TRON-inspired game features two light cycles that leave trails behind them as they move. Players must avoid colliding with the walls, their own trail, or their opponent's trail. The game includes power-ups that increase speed and score, and features both a player vs. player mode and a player vs. computer mode.

## How It Works

1. Players control light cycles that move continuously on a grid.
2. Each cycle leaves a permanent trail behind it.
3. Players must avoid colliding with walls, their own trail, or their opponent's trail.
4. Power-ups appear randomly on the grid, providing speed boosts and extra points when collected.
5. The game ends when a player collides with an obstacle.
6. Scores are based on distance traveled and power-ups collected.
7. A high score is maintained across game sessions using local storage.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tron-game.git
   cd tron-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port Vite specifies).

## Building for Production

To create a production build:

```
npm run build
```


The built files will be in the `dist` directory.

## Dependencies

- [Phaser 3](https://phaser.io/phaser3) - HTML5 game framework
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [Rollup Plugin Obfuscator](https://github.com/javascript-obfuscator/rollup-plugin-obfuscator) - JavaScript obfuscator for Rollup

## Dev Dependencies

- @vitejs/plugin-legacy
- terser
- vite

## Controls

- Player 1: 
  - W: Up
  - S: Down
  - A: Left
  - D: Right

- Player 2 (or Computer in PvC mode): 
  - ↑: Up
  - ↓: Down
  - ←: Left
  - →: Right

## Features

- Player vs Player and Player vs Computer modes
- Dynamic soundtrack that changes with gameplay
- Power-ups for speed boosts and extra points
- High score tracking
- Responsive design

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
