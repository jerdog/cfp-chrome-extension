/**
 * Utility class for error handling.
 */
class ErrorHandler {
    static showError(message, containerId = 'errorContainer') {
        const container = document.getElementById(containerId);
        container.textContent = message;
        container.style.display = 'block';
        setTimeout(() => {
            container.style.display = 'none';
        }, 5000);
    }
  }

  /**
   * Manages the storage and operations for talks.
   */
  class TalkManager {
    static async getAllTalks() {
        const { talks } = await chrome.storage.local.get(['talks']);
        return talks || [];
    }

    static async addTalk(talk) {
        const talks = await this.getAllTalks();
        talks.push(talk);
        await chrome.storage.local.set({ talks });
    }
  }

  /**
   * Manages the options page functionality.
   */
  class OptionsPage {
      constructor() {
          this.state = { talks: [] };
      }

      /**
       * Loads all talks from storage.
       */
      async loadTalks() {
          const { talks = [] } = await chrome.storage.local.get(['talks']);
          this.state.talks = talks;
          this.renderTalks();
      }

      /**
       * Renders all talks to the UI.
       */
      renderTalks() {
          const container = document.getElementById('talksContainer');
          container.innerHTML = this.state.talks.map((talk, index) => `
              <div class="talk-item">
                  <div>
                      <strong>${talk.title}</strong> (${talk.duration} mins, ${talk.level})
                  </div>
                  <div>
                      <button class="edit-btn" data-index="${index}">Edit</button>
                      <button class="delete-btn" data-index="${index}">Delete</button>
                  </div>
              </div>
          `).join('');
      }

      /**
       * Handles importing talks from a CSV file.
       */
      handleImportCsv(event) {
          const file = event.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (e) => {
              const content = e.target.result;
              const rows = content.split('\n').map(row => row.split(','));

              const talks = rows.slice(1).map(row => ({
                  title: row[0]?.trim() || '',
                  description: row[1]?.trim() || '',
                  duration: parseInt(row[2]?.trim() || '0', 10),
