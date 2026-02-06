/**
 * Expanded Spell Slots Module for D&D 5e
 * Adds configurable spell slots beyond 9th level
 */

const MODULE_ID = "expanded-spell-slots";

// Default configuration for expanded spell levels
const DEFAULT_CONFIG = {
  maxSpellLevel: 12,
  // Configuration per expanded spell level
  levels: {
    10: { enabled: true, characterLevel: 19, slots: 1 },
    11: { enabled: true, characterLevel: 20, slots: 1 },
    12: { enabled: true, characterLevel: 20, slots: 1 }
  }
};

// Store the original spell slot table so we can restore/modify it
let originalSpellSlotTable = null;

/**
 * Register module settings
 */
function registerSettings() {
  // Register the main settings menu - this is the ONLY place to configure
  game.settings.registerMenu(MODULE_ID, "configMenu", {
    name: "EXPANDED_SPELL_SLOTS.Settings.ConfigMenu.Name",
    label: "EXPANDED_SPELL_SLOTS.Settings.ConfigMenu.Label",
    hint: "EXPANDED_SPELL_SLOTS.Settings.ConfigMenu.Hint",
    icon: "fas fa-cogs",
    type: ExpandedSpellSlotsConfig,
    restricted: true
  });

  // Store the configuration data (hidden setting)
  game.settings.register(MODULE_ID, "config", {
    name: "Expanded Spell Slots Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_CONFIG
  });
}

/**
 * Get the current module configuration
 * @returns {Object} The configuration object
 */
function getConfig() {
  try {
    const config = game.settings.get(MODULE_ID, "config");
    return { ...DEFAULT_CONFIG, ...config };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

/**
 * Ordinal suffix helper (10th, 11th, 12th, 13th, 21st, 22nd, 23rd, etc.)
 */
function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Apply expanded spell slots by modifying the CONFIG
 * This modifies the spell slot table and spell levels
 */
function applyExpandedSpellSlots() {
  const config = getConfig();
  const maxLevel = config.maxSpellLevel;

  // Store original table if not already stored
  if (!originalSpellSlotTable) {
    originalSpellSlotTable = CONFIG.DND5E.SPELL_SLOT_TABLE.map(row => [...row]);
  }

  // Reset table to original
  CONFIG.DND5E.SPELL_SLOT_TABLE = originalSpellSlotTable.map(row => [...row]);

  // Add expanded spell levels to spellLevels config and localization
  updateSpellLevelsConfig(maxLevel);

  // Modify the spell slot table to add expanded spell levels
  // The table is indexed by character level - 1 (so index 0 = char level 1)
  // Each row contains slots per spell level (index 0 = 1st level spells)
  
  for (let spellLevel = 10; spellLevel <= maxLevel; spellLevel++) {
    // Handle both string and number keys
    const levelConfig = config.levels?.[spellLevel] || config.levels?.[String(spellLevel)];
    
    // Handle enabled being boolean or string
    const isEnabled = levelConfig?.enabled === true || levelConfig?.enabled === "true";
    
    if (!isEnabled) continue;

    const requiredCharLevel = parseInt(levelConfig.characterLevel) || 20;
    const slotsToGrant = parseInt(levelConfig.slots) || 1;

    // For each character level from requiredCharLevel to 20, add the spell slots
    for (let charLevel = requiredCharLevel; charLevel <= 20; charLevel++) {
      const rowIndex = charLevel - 1; // Table is 0-indexed
      const colIndex = spellLevel - 1; // Spell level 10 = index 9
      
      if (CONFIG.DND5E.SPELL_SLOT_TABLE[rowIndex]) {
        // Extend the array if needed
        while (CONFIG.DND5E.SPELL_SLOT_TABLE[rowIndex].length < colIndex + 1) {
          CONFIG.DND5E.SPELL_SLOT_TABLE[rowIndex].push(0);
        }
        CONFIG.DND5E.SPELL_SLOT_TABLE[rowIndex][colIndex] = slotsToGrant;
      }
    }
  }

  // Update the spellcasting model's internal table
  // The model is a DataModel instance that has its own copy of the table,
  // so we need to use updateSource() to update it properly
  if (CONFIG.DND5E.spellcasting?.spell?.updateSource) {
    CONFIG.DND5E.spellcasting.spell.updateSource({ table: CONFIG.DND5E.SPELL_SLOT_TABLE });
  }

  console.log(`${MODULE_ID} | Applied expanded spell slots up to level ${maxLevel}`);
}

/**
 * Update spell levels configuration and localization
 */
function updateSpellLevelsConfig(maxLevel) {
  // Ensure localization namespace exists
  if (game.i18n?.translations) {
    game.i18n.translations.DND5E ??= {};
    game.i18n.translations.DND5E.SPELLCASTING ??= {};
    game.i18n.translations.DND5E.SPELLCASTING.SLOTS ??= {};
  }

  // First, remove ALL expanded levels (10+) to reset
  for (let level = 10; level <= 99; level++) {
    delete CONFIG.DND5E.spellLevels[level];
    if (game.i18n?.translations?.DND5E?.SPELLCASTING?.SLOTS) {
      delete game.i18n.translations.DND5E.SPELLCASTING.SLOTS[`spell${level}`];
    }
  }

  // Add spell levels beyond 9 up to maxLevel
  for (let level = 10; level <= maxLevel; level++) {
    const label = `${getOrdinalSuffix(level)} Level`;
    
    // Add to spellLevels config
    CONFIG.DND5E.spellLevels[level] = label;
    
    // Add the slot label to D&D 5e's localization
    if (game.i18n?.translations?.DND5E?.SPELLCASTING?.SLOTS) {
      game.i18n.translations.DND5E.SPELLCASTING.SLOTS[`spell${level}`] = label;
    }
  }
}

/**
 * Reload the game to apply changes
 */
function reloadGame() {
  ui.notifications.info(game.i18n.localize("EXPANDED_SPELL_SLOTS.Reloading"), {permanent: true});
  // Use setTimeout to ensure the notification shows before reload
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

/**
 * Configuration Application for Expanded Spell Slots
 */
class ExpandedSpellSlotsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "expanded-spell-slots-config",
      title: game.i18n.localize("EXPANDED_SPELL_SLOTS.Settings.ConfigMenu.Title"),
      template: `modules/${MODULE_ID}/templates/config.hbs`,
      width: 520,
      height: "auto",
      closeOnSubmit: true
    });
  }

  getData(options = {}) {
    const config = getConfig();
    const levels = [];

    // Show levels from 10 up to maxSpellLevel (or at least 10)
    const maxToShow = Math.max(config.maxSpellLevel, 10);
    
    for (let level = 10; level <= maxToShow; level++) {
      // Handle both string and number keys (JSON converts number keys to strings)
      const levelConfig = config.levels?.[level] || config.levels?.[String(level)] || { enabled: false, characterLevel: 20, slots: 1 };
      
      // Handle enabled being boolean or string
      const isEnabled = levelConfig.enabled === true || levelConfig.enabled === "true";
      
      levels.push({
        level,
        label: `${getOrdinalSuffix(level)} Level`,
        enabled: isEnabled,
        characterLevel: parseInt(levelConfig.characterLevel) || 20,
        slots: parseInt(levelConfig.slots) || 1
      });
    }

    return {
      config,
      levels,
      maxSpellLevel: config.maxSpellLevel
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Add button to add more spell levels
    html.find('button[name="addLevel"]').click(ev => {
      ev.preventDefault();
      this._addLevel();
    });
    
    // Add button to remove a spell level
    html.find('button.remove-level').click(ev => {
      ev.preventDefault();
      const level = parseInt(ev.currentTarget.dataset.level);
      this._removeLevel(level);
    });
  }

  async _addLevel() {
    const config = getConfig();
    const newLevel = config.maxSpellLevel + 1;
    
    config.maxSpellLevel = newLevel;
    config.levels[newLevel] = { enabled: true, characterLevel: 20, slots: 1 };
    
    await game.settings.set(MODULE_ID, "config", config);
    this.render(true);
  }

  async _removeLevel(level) {
    const config = getConfig();
    
    if (level <= 10) return; // Can't remove below 10
    
    // Remove the level
    delete config.levels[level];
    
    // Adjust maxSpellLevel if needed
    if (level === config.maxSpellLevel) {
      config.maxSpellLevel = level - 1;
    }
    
    await game.settings.set(MODULE_ID, "config", config);
    this.render(true);
  }

  async _updateObject(event, formData) {
    const currentConfig = getConfig();

    // Build new configuration
    const newConfig = {
      maxSpellLevel: currentConfig.maxSpellLevel,
      levels: {}
    };

    // Process level configurations from formData
    for (let level = 10; level <= newConfig.maxSpellLevel; level++) {
      const enabledKey = `levels.${level}.enabled`;
      const charLevelKey = `levels.${level}.characterLevel`;
      const slotsKey = `levels.${level}.slots`;
      
      // Checkbox: if checked, formData will have the key with value "on" or true
      const enabledValue = formData[enabledKey];
      const isEnabled = enabledValue === true || enabledValue === "on" || enabledValue === "true";
      
      newConfig.levels[level] = {
        enabled: isEnabled,
        characterLevel: parseInt(formData[charLevelKey]) || 20,
        slots: parseInt(formData[slotsKey]) || 1
      };
    }

    // Save settings
    await game.settings.set(MODULE_ID, "config", newConfig);
    
    // Small delay to ensure settings are written to disk
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload to apply changes
    reloadGame();
  }
}

/**
 * Register Handlebars templates
 */
async function registerTemplates() {
  const templatePath = `modules/${MODULE_ID}/templates/config.hbs`;
  await loadTemplates([templatePath]);
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/**
 * Init hook - Register settings
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Expanded Spell Slots`);
  registerSettings();
});

/**
 * Setup hook - Apply spell slot modifications early
 */
Hooks.once("setup", () => {
  console.log(`${MODULE_ID} | Setup - Applying expanded spell slots`);
  applyExpandedSpellSlots();
});

/**
 * i18nInit hook - Update localizations
 */
Hooks.once("i18nInit", () => {
  const config = getConfig();
  updateSpellLevelsConfig(config.maxSpellLevel);
});

/**
 * Ready hook - Final setup
 */
Hooks.once("ready", async () => {
  console.log(`${MODULE_ID} | Ready`);
  await registerTemplates();
  
  // Ensure everything is applied
  applyExpandedSpellSlots();
  
  // Force all actors to re-prepare their spellcasting data
  // We use a safer approach that doesn't interfere with other modules
  for (const actor of game.actors) {
    if (actor.system?.spells && actor._prepareSpellcasting) {
      try {
        // Only re-run the spellcasting preparation, not the full prepareData
        actor._prepareSpellcasting();
      } catch (e) {
        console.warn(`${MODULE_ID} | Could not re-prepare spellcasting for ${actor.name}:`, e);
      }
    }
  }
  
  // Also handle any synthetic token actors on active scenes
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      const actor = token.actor;
      if (actor?.system?.spells && actor._prepareSpellcasting) {
        try {
          actor._prepareSpellcasting();
        } catch (e) {
          // Silently ignore token actor errors
        }
      }
    }
  }
  
  console.log(`${MODULE_ID} | Re-prepared spellcasting for all actors`);
});

// Export for debugging
globalThis.ExpandedSpellSlots = {
  getConfig,
  applyExpandedSpellSlots,
  MODULE_ID,
  getSpellSlotTable: () => CONFIG.DND5E.SPELL_SLOT_TABLE
};
