class ErrorHandler {
  static showError(message, containerId = 'errorContainer') {
      const container = document.getElementById(containerId);
      container.textContent = message;
      container.style.display = 'block';
      setTimeout(() => {
          container.style.display = 'none';
      }, 5000);
  }

  static async handleApiError(error, operation) {
      console.error(`Error during ${operation}:`, error);
      let message = `Failed to ${operation}. `;
      if (error.response) {
          message += `Server responded with: ${error.response.status}`;
      } else if (error.request) {
          message += 'No response received from server.';
      } else {
          message += error.message;
      }
      this.showError(message);
      throw error;
  }
}

class TalkManager {
  static async getAllTalks() {
      try {
          const { talks } = await chrome.storage.local.get(['talks']);
          return talks || [];
      } catch (error) {
          ErrorHandler.handleApiError(error, 'fetch talks');
          return [];
      }
  }

  static async updateTalk(index, updatedTalk) {
      try {
          const talks = await this.getAllTalks();
          talks[index] = updatedTalk;
          await chrome.storage.local.set({ talks });
          return true;
      } catch (error) {
          ErrorHandler.handleApiError(error, 'update talk');
          return false;
      }
  }

  static async deleteTalks(indices) {
      try {
          const talks = await this.getAllTalks();
          const newTalks = talks.filter((_, index) => !indices.includes(index));
          await chrome.storage.local.set({ talks: newTalks });
          return true;
      } catch (error) {
          ErrorHandler.handleApiError(error, 'delete talks');
          return false;
      }
  }
}

class CustomFieldsManager {
  static async getCustomFields() {
      try {
          const { customFields } = await chrome.storage.sync.get(['customFields']);
          return customFields || [];
      } catch (error) {
          ErrorHandler.handleApiError(error, 'fetch custom fields');
          return [];
      }
  }

  static async saveCustomField(field) {
      try {
          const customFields = await this.getCustomFields();
          customFields.push(field);
          await chrome.storage.sync.set({ customFields });
          return true;
      } catch (error) {
          ErrorHandler.handleApiError(error, 'save custom field');
          return false;
      }
  }

  static async deleteCustomField(index) {
      try {
          const customFields = await this.getCustomFields();
          customFields.splice(index, 1);
          await chrome.storage.sync.set({ customFields });
          return true;
      } catch (error) {
          ErrorHandler.handleApiError(error, 'delete custom field');
          return false;
      }
  }
}

class OptionsPage {
    constructor() {
        this.state = { talks: [] };

        // Bind methods
        this.loadTalks = this.loadTalks.bind(this);
        this.renderTalks = this.renderTalks.bind(this);
        this.handleEditTalk = this.handleEditTalk.bind(this);
        this.handleDeleteTalk = this.handleDeleteTalk.bind(this);
        this.handleAddTalk = this.handleAddTalk.bind(this);
        this.handleSaveTalk = this.handleSaveTalk.bind(this);
        this.handleDeleteAll = this.handleDeleteAll.bind(this);
        this.loadSessionizeUrl = this.loadSessionizeUrl.bind(this);
        this.saveSessionizeUrl = this.saveSessionizeUrl.bind(this);
    }

    async loadTalks() {
        const { talks = [] } = await chrome.storage.local.get(['talks']);
        this.state.talks = talks;
        this.renderTalks();
    }

    async loadSessionizeUrl() {
        const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
        const input = document.getElementById('sessionizeUrl');
        if (sessionizeUrl) {
            input.value = sessionizeUrl;
        }
    }

    async saveSessionizeUrl() {
        const sessionizeUrl = document.getElementById('sessionizeUrl').value;
        if (!sessionizeUrl) {
            alert('Sessionize URL cannot be empty.');
            return;
        }
        await chrome.storage.sync.set({ sessionizeUrl });
        alert('Sessionize URL saved successfully!');
    }

    renderTalks() {
        const container = document.getElementById('talksContainer');
        if (!container) return;

        container.innerHTML = this.state.talks.map((talk, index) => `
            <div class="talk-item">
                <div class="talk-details">
                    <strong>${talk.title}</strong> (${talk.duration} mins, ${talk.level})
                </div>
                <div class="button-group">
                    <button class="edit-btn" data-index="${index}">Edit</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        container.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', this.handleEditTalk);
        });

        container.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', this.handleDeleteTalk);
        });
    }

    handleEditTalk(event) {
        const index = event.target.dataset.index;
        const talk = this.state.talks[index];
        if (!talk) return;

        document.getElementById('talkTitle').value = talk.title;
        document.getElementById('talkDescription').value = talk.description;
        document.getElementById('talkDuration').value = talk.duration;
        document.getElementById('talkLevel').value = talk.level;

        document.getElementById('saveTalkBtn').dataset.index = index;
        this.openModal();
    }

    async handleDeleteTalk(event) {
        const index = event.target.dataset.index;
        const talks = this.state.talks.filter((_, i) => i != index);

        await chrome.storage.local.set({ talks });
        this.state.talks = talks;
        this.renderTalks();
    }

    async handleDeleteAll() {
        if (!confirm('Are you sure you want to delete all talks?')) return;

        await chrome.storage.local.set({ talks: [] });
        this.state.talks = [];
        this.renderTalks();
    }

    handleAddTalk() {
        document.getElementById('talkTitle').value = '';
        document.getElementById('talkDescription').value = '';
        document.getElementById('talkDuration').value = '';
        document.getElementById('talkLevel').value = 'Beginner';

        delete document.getElementById('saveTalkBtn').dataset.index;
        this.openModal();
    }

    async handleSaveTalk() {
        const index = document.getElementById('saveTalkBtn').dataset.index;
        const newTalk = {
            title: document.getElementById('talkTitle').value,
            description: document.getElementById('talkDescription').value,
            duration: parseInt(document.getElementById('talkDuration').value),
            level: document.getElementById('talkLevel').value,
        };

        if (index !== undefined) {
            this.state.talks[index] = newTalk;
        } else {
            this.state.talks.push(newTalk);
        }

        await chrome.storage.local.set({ talks: this.state.talks });
        this.renderTalks();
        this.closeModal();
    }

    openModal() {
        document.getElementById('addEditModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    closeModal() {
        document.getElementById('addEditModal').style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    }

    async init() {
        await this.loadTalks();
        await this.loadSessionizeUrl();

        document.getElementById('addTalkBtn').addEventListener('click', this.handleAddTalk);
        document.getElementById('saveTalkBtn').addEventListener('click', this.handleSaveTalk.bind(this));
        document.getElementById('deleteAllBtn').addEventListener('click', this.handleDeleteAll.bind(this));
        document.getElementById('closeModal').addEventListener('click', this.closeModal.bind(this));
        document.getElementById('saveSessionizeBtn').addEventListener('click', this.saveSessionizeUrl);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const optionsPage = new OptionsPage();
    optionsPage.init();
});
