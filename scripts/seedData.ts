// The catalogue moved to lib/catalog.ts (ADR 0002, decision 3), so the app can use it as a fallback.
// Re-exported here so the seed and reset scripts keep their import path.
export { seedPayload, validateSeed, type SeedPayload } from '../lib/catalog'
