# Architecture

Verdure is deliberately asset-light. Its core visual identity is generated from code so a seed can recreate the same specimen and interior world.

## Runtime layers

### 1. Seeded field generation

`src/lib/noise.ts` provides deterministic value noise, FBM and ridge functions. `src/lib/forest.ts` uses those fields to derive terrain height, forest density, tree placement and rocks.

The distribution is density-driven rather than uniform. This matters aesthetically: clearings and clumps are structural, not accidents.

### 2. Forest geometry

`Forest.tsx` renders trunks, fractal-ish canopy clumps and rocks using `InstancedMesh`. A tree is deliberately an abstraction. Five irregular canopy clumps produce a mossy silhouette without paying for individual leaves.

### 3. Terrain and atmosphere

Terrain is a displaced grid sampled from the same seed. Mist uses small generated radial textures on sprites, and motes use a point cloud. There are no downloaded textures in the core scene.

### 4. The specimen

`Gem.tsx` deforms a sphere into a tapered cabochon and renders it with a transmissive physical material. Additional translucent mineral bodies sit behind the forest to break up the interior and echo cloudy inclusions.

### 5. Scale transition

In specimen mode the world is scaled to roughly 13.5%, rotated almost vertically and visually compressed inside the cabochon. Entering the forest unfolds the same group to horizontal terrain and full scale while the shell fades.

No separate scene is loaded. That continuity is intentional.

### 6. Navigation

After entry, `WanderControls.tsx` provides restrained exploration: drag to look, WASD/arrow keys or the mouse wheel to move. The camera follows procedural terrain height and remains inside the generated bounds.

### 7. Audio

`useAmbientAudio.ts` builds the initial sound bed from generated noise, filters and oscillators. Audio starts only after explicit user interaction.

## Performance strategy

Current priorities:

- instancing for repeated vegetation and stones;
- intentionally low-poly canopy geometry;
- capped device pixel ratio;
- no realtime shadow maps on the main forest;
- no remote assets in the critical path;
- deterministic CPU generation performed when the seed changes, not every frame.

## Future rendering path

WebGL remains the baseline until the visual gain from WebGPU is concrete. WebGPU should enter for things such as volumetric ray marching, compute-driven vegetation or very large chunked worlds, rather than as a badge on the README.
