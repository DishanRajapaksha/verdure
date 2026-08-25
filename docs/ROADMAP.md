# Roadmap

This is a direction, not a promise to turn Verdure into a settings-heavy engine demo.

## 0.1: The first specimen

- Seeded procedural terrain and forest
- Clustered canopies and true clearings
- Deformed transmissive cabochon
- Mineral inclusions
- Exterior-to-interior scale transition
- Mist and airborne motes
- Keyboard, mouse-drag and wheel exploration
- Reproducible world seeds in the URL
- Opt-in procedural ambient audio
- Reduced-motion handling
- CI and deterministic generator tests

## 0.2: Better geology

- Replace the simple cabochon deformation with an SDF or authored procedural volume
- Layered chalcedony bands
- Dendritic mineral growth that shares fields with the forest distribution
- Better internal absorption and caustic approximation
- Photo mode for macro specimen views

## 0.3: Better forest

- Multiple procedural tree families
- Fallen trunks, roots, ferns and forest-floor debris
- Wetness after simulated rain
- Localised fog pockets driven by terrain basins
- Rare landmarks generated from the seed
- Better low-frequency colour variation across biomes

## 0.4: The endless interior

- Chunked deterministic terrain around the viewer
- Floating-origin camera strategy
- Stable biome transitions across chunk boundaries
- LOD for canopy geometry
- Seeded paths that sometimes disappear
- No minimap

## 0.5: Light and weather

- Slow time-of-day drift rather than a clock UI
- Rain heard before it arrives
- Fog fronts
- Sun shafts where they genuinely improve depth
- WebGPU volumetrics if browser support and performance justify it

## 0.6: Living quiet

- Sparse procedural sound events
- Rare distant wildlife rather than constant animation
- Wind response in the canopy
- A few things the player may never see in a given seed

## 1.0 criterion

Verdure reaches 1.0 when spending ten minutes inside it feels more compelling than opening its settings. If the settings screen becomes the interesting part, we have wandered into the wrong forest.
