// Export everything from the new modular storage system
// This replaces the old monolithic storage.ts file that had top-level database imports
export { storage, getStorage, type IStorage } from "./storage/index";