/**
 * Loads all config JSON files in parallel.
 * @returns {Promise<{road: object, characters: object[], secondaryCharacters: object, scenarios: object}>}
 */
export async function loadConfigs() {
  const [road, characters, secondaryCharacters, scenarios] = await Promise.all([
    fetch('./config/road.json').then(r => r.json()),
    fetch('./config/characters.json').then(r => r.json()),
    fetch('./config/secondary-characters.json').then(r => r.json()),
    fetch('./config/scenarios.json').then(r => r.json()),
  ]);
  return { road, characters, secondaryCharacters, scenarios };
}
