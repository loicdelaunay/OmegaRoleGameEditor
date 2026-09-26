<div align="center">
  <img src="public/logo.png" alt="OmegaRoleGameEditor logo" width="92" />

  # OmegaRoleGameEditor

  **Build tabletop scenes, run your game, and share a dedicated view with players.**

  Map editor · Virtual tabletop · Real-time sessions
</div>

---

## Preview

| Game Master editor | Player view |
| :---: | :---: |
| <img src="docs/screenshots/editor.png" alt="Game Master editor with scene hierarchy, map, and inspector" width="600" /> | <img src="docs/screenshots/player.png" alt="Clean player view of the same scene" width="600" /> |

The screenshots use an original [demo map](docs/demo/observatory-map.svg) made for this repository.

## Features

| Build | Run | Share |
| --- | --- | --- |
| Import images and tokens, arrange layers and nested objects, then move and transform scene elements. | Prepare notes, effects, audio, dice, and other Game Master tools. | Host a room with Express and WebSocket, then stream the visible scene to players. |

The Game Master editor and player view are separate. Hidden elements and editing-only information are not sent to players.

## Quick start

**Requirements:** Node.js and npm. Google Chrome is recommended for file handling and some scene interactions.

```bash
npm ci
npm run dev:full
```

Open **http://localhost:5173**. The session server listens on **http://localhost:8787** by default. You can change both ports in [`config.json`](config.json).

1. Switch to **MJ** (Game Master) mode and create a terrain.
2. Add images, tokens, and layers; edit their properties in the inspector.
3. Use **Sauvegarder sous…** (Save As) to export the scene.
4. Open **Host** mode and share the room code with your players.
5. Players switch to **Joueur** (Player) mode to join the session.

## Portable saves

Each terrain exports as **one `.terrain.json` file**. Images are embedded as Data URLs, so the scene can travel without a separate asset directory. Older terrain JSON files remain loadable as the format evolves.

## Stack and scripts

**Client:** Vite, React, TypeScript, Material UI. **Session server:** Express and WebSocket.

| Command | Purpose |
| --- | --- |
| `npm run dev:full` | Start the client and session server together. |
| `npm run dev` | Start only the client. |
| `npm run dev:server` | Start only the session server. |
| `npm run build` | Check TypeScript and build the production client. |
| `npm test` | Run business logic tests. |
| `npm run lint` | Run ESLint. |

The client lives in [`src/`](src), the server in [`server/`](server), and public assets in [`public/`](public). Personal campaigns are not included in this repository.

## Detailed features

The checkboxes below describe features available in the current application.

### Live collaboration and player controls

- [x] **Host and join sessions:** the Game Master creates a room; players join it with a room code in a separate player interface.
- [x] **Live scene sharing:** terrain changes, added or removed objects, and shared audio state reach connected players through WebSocket.
- [x] **Player identities:** prepare player slots before a session, see who is connected, and assign a player to a map token.
- [x] **Individual camera rules:** give each player a free view, a view following the host, a view locked to their token, or a view following the current turn; limit the visible area where applicable.
- [x] **Controlled visibility:** hidden layers and objects, plus private Game Master notes, are excluded from the player terrain; notes can have separate player-facing text.
- [x] **Shared map cues:** display host and player cursors, send pings, and measure distances on the map together.
- [x] **Turn order:** manage players and custom entries such as enemies or traps; move through turns, shuffle the order, focus a token, and reset action, movement, and intervention points. Players can mark their own points.
- [x] **Session timers:** share countdowns and stopwatches, with pause, resume, and removal controls.
- [x] **Shared dice:** roll presets (d4, d6, d12, d100) or a custom formula, add a reason and target, and review the roll history. The Game Master can make a discreet roll.
- [x] **In-game phone:** exchange messages in conversations with players and Game Master-created NPC contacts, with unread indicators; eligible players can toggle their phone flashlight.
- [x] **Character updates:** link a character sheet to a token, show its read-only player view, and synchronize character vitals during the session.

### Map and scene editing

- [x] **Terrain setup:** edit the scene name, dimensions, grid size, and background color.
- [x] **Direct manipulation:** select one or several objects, drag them on the map, resize, rotate, flip, and adjust their geometry in the inspector; use zoom, pan, and optional grid snapping.
- [x] **Organized hierarchy:** create layers and nested groups, search the hierarchy, rearrange objects, and control visibility and locking.
- [x] **Object properties:** change an object's name, type, layer, position, size, rotation, opacity, and other type-specific settings.
- [x] **Editing helpers:** undo scene changes, copy and paste objects, remove objects, and use the documented keyboard shortcuts.
- [x] **Lighting and privacy tools:** place shadow zones and light objects, configure night mode and per-player flashlight range, opacity, and cone angle, and preview player vision from the editor.
- [x] **Scene notes:** place Game Master notes on the map and optionally provide separate text visible to players.

### Assets, effects, and sound

- [x] **Image and token import:** add local artwork to the scene, replace an object's image, or browse the asset library.
- [x] **Built-in shapes:** generate recolorable SVG shapes and add them as images, lights, or interactive tokens.
- [x] **Visual effects:** preview and apply filters such as blur, sepia, contrast, and glow, or animations such as ripple, fire, pulse, and spin; adjust effects per object.
- [x] **Music playback:** load a local audio file or a YouTube URL, manage YouTube history and favorites, and control music and sound-effect volumes separately.
- [x] **Map audio objects:** position sounds in the scene and configure their playback, range, and spatial audio behavior.
- [x] **Soundboard:** import and search sound effects, preview or remove them, then play them globally or place them on the map with a chosen range.
- [x] **Scene review:** inspect asset types and estimated save size, convert eligible images to WebP, and merge visually identical images to reduce file size.

### Character sheets and rules

- [x] **Character profiles:** maintain identity, characteristics, resources, and Game Master validation status in dedicated character files.
- [x] **Skills and derived values:** edit skills and their properties, and use computed values and characteristic-based dice rolls.
- [x] **Equipment:** manage inventory, carried items, equipment, weapons, ammunition, weights, effects, and modifiers.
- [x] **Lore:** record character history and role-playing details alongside mechanical data.
- [x] **Configurable tables:** adjust character-sheet table columns and use a separate configuration tab in edit mode.

### Files and workspace

- [x] **Portable terrain saves:** save and reopen a single `.terrain.json` file with scene images embedded as Data URLs; older terrain files remain loadable.
- [x] **Project workspace:** browse terrain and character files in a chosen work folder, create or open files, and save scenes manually or automatically after changes.
- [x] **Theme and controls:** choose light, dark, or system theme and configure interaction preferences such as dice display and zoom behavior.
