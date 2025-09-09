import { readFile } from 'fs/promises';
import { join } from 'path';

let mupdfInstance: any = null;
let initializationPromise: Promise<any> | null = null;

/**
 * Initialize MuPDF with WASM module
 * This handles the async initialization and caches the instance
 */
export async function getMuPDFInstance() {
  // Return cached instance if already initialized
  if (mupdfInstance) {
    return mupdfInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return await initializationPromise;
  }

  // Start initialization
  initializationPromise = initializeMuPDF();
  mupdfInstance = await initializationPromise;
  return mupdfInstance;
}

async function initializeMuPDF() {
  try {
    // Dynamic import to handle ESM module
    const mupdfModule = await import('mupdf');
    
    // The module exports both named exports and a default
    // The default contains all the same exports, so we can use either
    const mupdf = mupdfModule.default || mupdfModule;
    
    // Check if we have the expected API
    if (mupdf.Document && typeof mupdf.Document.openDocument === 'function') {
      console.log('MuPDF initialized successfully');
      return mupdf;
    }
    
    // Fallback: if default is an object but doesn't have Document, use the module itself
    if (mupdfModule.Document && typeof mupdfModule.Document.openDocument === 'function') {
      console.log('MuPDF initialized successfully (using module exports)');
      return mupdfModule;
    }
    
    throw new Error('MuPDF module loaded but Document API not found');
  } catch (error) {
    console.error('MuPDF initialization error:', error);
    throw new Error(`Failed to initialize MuPDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reset the MuPDF instance (useful for testing or re-initialization)
 */
export function resetMuPDFInstance() {
  mupdfInstance = null;
  initializationPromise = null;
}