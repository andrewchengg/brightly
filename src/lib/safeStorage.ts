// src/lib/safeStorage.ts
"use client"; // Important if these utilities are only ever meant for client-side code

const safeStorage = {
  getItem: (key: string, storageType: 'local' | 'session' = 'local'): string | null => {
    try {
      if (typeof window === 'undefined') {
        // console.warn(`safeStorage.getItem called on server for key: ${key}`);
        return null;
      }
      return storageType === 'local' 
        ? window.localStorage.getItem(key) 
        : window.sessionStorage.getItem(key);
    } catch (e) {
      console.error(`Error accessing ${storageType}Storage for key "${key}":`, e);
      return null;
    }
  },
  
  setItem: (key: string, value: string, storageType: 'local' | 'session' = 'local'): void => {
    try {
      if (typeof window === 'undefined') {
        // console.warn(`safeStorage.setItem called on server for key: ${key}`);
        return;
      }
      storageType === 'local' 
        ? window.localStorage.setItem(key, value) 
        : window.sessionStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error setting ${storageType}Storage for key "${key}":`, e);
    }
  },
  
  removeItem: (key: string, storageType: 'local' | 'session' = 'local'): void => {
    try {
      if (typeof window === 'undefined') {
        // console.warn(`safeStorage.removeItem called on server for key: ${key}`);
        return;
      }
      storageType === 'local' 
        ? window.localStorage.removeItem(key) 
        : window.sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing from ${storageType}Storage for key "${key}":`, e);
    }
  }
};

export default safeStorage;