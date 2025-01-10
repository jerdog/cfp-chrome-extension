chrome.runtime.onInstalled.addListener(async () => {
  try {
      const { talks = [] } = await chrome.storage.local.get(['talks']);

      // Ensure all existing talks have "notes" and "pitch" fields
      const updatedTalks = talks.map(talk => ({
          ...talk,
          pitch: talk.pitch || '', // Add "pitch" field if it doesn't exist
          notes: talk.notes || '',  // Add "notes" field if it doesn't exist
      }));

      await chrome.storage.local.set({ talks: updatedTalks, selectedTalks: {} });
      await chrome.storage.sync.set({ customFields: [] });

      console.log('Extension installed/updated successfully. Notes field ensured for all talks.');
  } catch (error) {
      console.error('Error initializing storage:', error);
  }
});