# Cosy Catch

A cozy, fishing-only game. Cast a line, hold to reel, and find out what you caught. Sell your fish, or keep the best
in your aquarium. Level up, buy better gear, and unlock new places with their own fish: 44 species across 7 spots.

Made from the fishing in the Cosycorp farm game.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run typecheck
npm run build
```

## How to play

- **Cast** with **Space** or a click. Wait for a bite, then **hold Space or the mouse** to raise the green catch zone.
  Keep the fish inside it until the meter on the right fills.
- You only see a plain little fish on the line. The real fish is **revealed when you land it**: its art, name, length and size class.
- **Bigger fish are harder and slower to reel in**, but **every fish tires** on the hook, so a fish that never breaks loose is landed in the end.
- **Size classes:** a longer fish is silver ★ (+25% price) or gold ★★ (+50%).
- Choose for each catch: **Sell** it, **Keep** it for the aquarium, or leave it in the **bucket** (a full bucket stops you casting).

| Key | Does |
|---|---|
| Space / click | Cast, and hold to reel |
| Esc | Close a panel, or reel in while waiting |
| B S M A L | Tackle box tabs: Bucket, Shop, Places, Aquarium, Fish Log |

## Progression

- **Levels 1–30** from XP: bigger and rarer fish give more, and the first catch of each species is worth triple.
- **Gear:** rod (bigger catch zone), reel (fills faster), line (slips less), bucket (holds more).
- **Bait:** worms bite sooner, dough gives bigger fish, shrimp and lures draw rare fish.
- **Seven places:** Willow Pond, Quiet Brook, Mirror Lake, Frostwater Lake, Sunset Harbour, Coral Reef and Starfall Deep.
  Each unlocks with a level and a price. Time of day (dawn, day, dusk, night) and weather decide which fish bite, so skip
  ahead with the "Wait for" buttons to find the night and rain fish.
- **Aquarium:** keep fish in tanks (more tanks to buy), add decorations, and the fish on show pay **tips** while you play.
- **Fish Log:** every species, your longest catch of each, and where and when to find it.

## Code

Same rules as the farm game: the simulation in `src/sim/` is pure and deterministic (seeded RNG, no DOM), content is data in
`src/data/`, numbers are in `src/data/balance.ts`, and the UI (`src/ui/`) only reads state and sends commands.
The picture is a 2D canvas (`src/ui/scene.ts`) and the fish are drawn procedurally from a look table (`src/ui/fishArt.ts`).
