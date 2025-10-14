import type { IStorage } from "./interface";

// Storage initialization with fallback logic
let storageInstance: IStorage | null = null;
let initializationPromise: Promise<IStorage> | null = null;

async function initializeStorage(): Promise<IStorage> {
  console.log('🔄 Initializing storage...');
  
  // If DATABASE_URL is missing in development, skip directly to MemStorage
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not found in development, using MemStorage');
    const { MemStorage } = await import('./memory');
    return new MemStorage();
  }

  // If DATABASE_URL exists, try to use DatabaseStorage
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔍 Attempting to initialize DatabaseStorage...');
      
      // Dynamic import to avoid top-level database dependency crashes
      const { DatabaseStorage } = await import('./database');
      const dbStorage = new DatabaseStorage();
      
      // Test database connection with a simple query with timeout and retries
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout (15s) - database may be paused')), 15000)
      );
      
      // Try to wake up the database with retries
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          console.log(`🔌 Attempting database connection (${4 - retries}/3)...`);
          await Promise.race([
            dbStorage.getUser(1),
            timeoutPromise
          ]);
          break; // Success!
        } catch (error: any) {
          lastError = error;
          retries--;
          if (retries > 0) {
            console.log(`⏳ Retry in 2s... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (retries === 0) {
        throw lastError;
      }
      
      console.log('✅ DatabaseStorage initialized successfully');
      return dbStorage;
    } catch (error: any) {
      console.error('❌ DatabaseStorage initialization failed:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Database connection failed in development, falling back to MemStorage');
        console.warn('💡 If database is paused, it will auto-resume on next connection');
        console.warn('Database error details:', error.message);
        const { MemStorage } = await import('./memory');
        return new MemStorage();
      } else {
        console.error('❌ Database connection failed in production:', error.message);
        throw new Error(`Database connection failed in production: ${error.message}`);
      }
    }
  }

  // Fallback for development environment
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  No DATABASE_URL found, using MemStorage for development');
    const { MemStorage } = await import('./memory');
    return new MemStorage();
  }

  // Production requires database
  throw new Error('DATABASE_URL is required in production environment');
}

// Lazy initialization function
export async function getStorage(): Promise<IStorage> {
  if (storageInstance) {
    return storageInstance;
  }

  if (!initializationPromise) {
    initializationPromise = initializeStorage();
  }

  try {
    storageInstance = await initializationPromise;
    return storageInstance;
  } catch (error) {
    // Reset initialization promise on error to allow retry
    initializationPromise = null;
    throw error;
  }
}

// Create a proxy that initializes storage on first access
export const storage = new Proxy({} as IStorage, {
  get(target, prop, receiver) {
    // Return a function that will initialize storage and call the method
    return async (...args: any[]) => {
      const actualStorage = await getStorage();
      const method = Reflect.get(actualStorage, prop, receiver);
      if (typeof method === 'function') {
        return method.apply(actualStorage, args);
      }
      return method;
    };
  }
});

// Export types for consumers
export type { IStorage } from "./interface";