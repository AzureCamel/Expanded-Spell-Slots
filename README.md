# Expanded Spell Slots

A Foundry VTT module for D&D 5e that adds configurable spell slots beyond 9th level.

## Features

- Add spell levels 10th through 15th
- Configure which character level unlocks each expanded spell level
- Configure how many slots are available at each level
- Fully integrated with the D&D 5e system's spell slot management
- Works with both standard and custom spellcasting progressions
- Per-actor slot override support

## Installation

### Manual Installation
1. Download or clone this repository
2. Place the `expanded-spell-slots` folder in your Foundry VTT `Data/modules/` directory
3. Restart Foundry VTT
4. Enable the module in your game's module settings

### Manifest URL
```
https://your-url/module.json
```

## Configuration

Click the **Configure** button in the module settings to access the configuration menu where you can:

- **Add/Remove** spell levels beyond 9th (no upper limit!)
- **Enable/Disable** each expanded spell level individually
- Set the **Character Level Required** for each expanded spell level
- Set the **Number of Slots** available at each level

Changes require a game reload to take effect - the module will prompt you automatically.

### Default Configuration

| Spell Level | Character Level Required | Slots |
|-------------|-------------------------|-------|
| 10th Level  | 19                      | 1     |
| 11th Level  | 20                      | 1     |
| 12th Level  | 20                      | 1     |

## Usage

Once configured:

1. Characters who meet the level requirements will automatically see the expanded spell slots on their character sheet
2. Spell slots can be used and recovered just like standard spell slots
3. GMs can override individual slot values on a per-character basis using the character sheet

## Compatibility

- **Foundry VTT**: Version 13+
- **D&D 5e System**: Version 5.0.0+ (verified with 5.2.4)

## API

The module exposes a global object for debugging and advanced use:

```javascript
// Get current configuration
ExpandedSpellSlots.getConfig()

// Refresh spell levels in config
ExpandedSpellSlots.updateSpellLevelsConfig()

// Refresh all actors
ExpandedSpellSlots.refreshAllActors()
```

## Technical Details

This module works by:
1. Adding new spell levels to `CONFIG.DND5E.spellLevels`
2. Hooking into `dnd5e.prepareSpellSlots` and `dnd5e.prepareLeveledSlots` to add expanded spell slots to actors
3. Using the standard D&D 5e spell slot data structure for full compatibility

## License

This module is provided as-is for use with Foundry VTT and the D&D 5e system.

## Support

For issues or feature requests, please open an issue on the repository.
