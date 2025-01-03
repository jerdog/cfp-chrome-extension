chrome.runtime.onInstalled.addListener(async () => {
  try {
      await chrome.storage.local.set({ talks: [], selectedTalks: {} });
      await chrome.storage.sync.set({ customFields: [] });
  } catch (error) {
      console.error('Error initializing storage:', error);
  }
});