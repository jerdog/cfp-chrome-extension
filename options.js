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

  static async addTalk(talk) {
      try {
          const talks = await this.getAllTalks();
          talks.push(talk);
          await chrome.storage.local.set({ talks });
      } catch (error) {
          ErrorHandler.handleApiError(error, 'add talk');
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
        this.handleImportCsv = this.handleImportCsv.bind(this);
        this.handleDownloadTemplate = this.handleDownloadTemplate.bind(this);
        this.loadSessionizeUrl = this.loadSessionizeUrl.bind(this);
        this.saveSessionizeUrl = this.saveSessionizeUrl.bind(this);
        this.fetchSessionizeTalks = this.fetchSessionizeTalks.bind(this);
        this.openTalkModal = this.openTalkModal.bind(this);
        this.closeTalkModal = this.closeTalkModal.bind(this);
        this.handleAddTalk = this.handleAddTalk.bind(this);
        this.handleSaveTalk = this.handleSaveTalk.bind(this);
        this.handleDeleteAll = this.handleDeleteAll.bind(this);
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

    async fetchSessionizeTalks() {
    const statusElement = document.getElementById('fetchSessionizeStatus');
    statusElement.textContent = '';
    statusElement.style.color = '';

    const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
    if (!sessionizeUrl) {
        statusElement.textContent = 'Please set your Sessionize API URL.';
        statusElement.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(sessionizeUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const rawData = await response.json();
        const talks = Array.isArray(rawData) ? rawData : rawData.sessions || [];
        const formattedTalks = talks.map(talk => ({
            title: talk.title || 'Untitled',
            description: talk.description || 'No description provided.',
            duration: parseInt(talk.duration || '0', 10),
            level: talk.level || 'Beginner',
        }));

        // Get existing talks from storage
        const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);

        // Filter out duplicate talks
        const newTalks = formattedTalks.filter(newTalk =>
            !existingTalks.some(existingTalk => existingTalk.title === newTalk.title)
        );

        if (newTalks.length > 0) {
            this.state.talks = [...existingTalks, ...newTalks];
            await chrome.storage.local.set({ talks: this.state.talks });
            this.renderTalks();
        }

        statusElement.textContent = `Successfully added ${newTalks.length} new talks. ${formattedTalks.length - newTalks.length} duplicates skipped.`;
        statusElement.style.color = 'green';
    } catch (error) {
        console.error('Error fetching from Sessionize:', error);
        statusElement.textContent = 'Failed to fetch talks. Check the URL.';
        statusElement.style.color = 'red';
    }

    // Clear the status message after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}

    async saveSessionizeUrl() {
        const sessionizeUrl = document.getElementById('sessionizeUrl').value;
        const statusMessage = document.createElement('span');
        const button = document.getElementById('saveSessionizeBtn');
        let existingMessage = button.nextSibling;

        // Clear existing status message
        if (existingMessage && existingMessage.nodeName === 'SPAN') {
            button.parentNode.removeChild(existingMessage);
        }

        if (!sessionizeUrl) {
            statusMessage.textContent = 'Sessionize URL cannot be empty.';
            statusMessage.style.color = 'red';
            button.parentNode.insertBefore(statusMessage, button.nextSibling);
            return;
        }

        await chrome.storage.sync.set({ sessionizeUrl });
        statusMessage.textContent = 'Sessionize URL saved successfully!';
        statusMessage.style.color = 'green';
        button.parentNode.insertBefore(statusMessage, button.nextSibling);

        setTimeout(() => {
            if (statusMessage) {
                statusMessage.remove();
            }
        }, 3000);
    }

    async loadCustomFields() {
        const customFields = await CustomFieldsManager.getCustomFields();
        const container = document.getElementById('customFieldsContainer');
        container.innerHTML = customFields.map((field, index) => `
            <div class="custom-field-item">
                <div class="custom-field-details">
                    <strong>${field.name}:</strong> ${field.value}
                </div>
                <div>
                    <button class="edit-custom-field-btn" data-index="${index}">Edit</button>
                    <button class="delete-custom-field-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.edit-custom-field-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const index = parseInt(button.dataset.index, 10);
                const customFields = await CustomFieldsManager.getCustomFields();
                const field = customFields[index];
                document.getElementById('customFieldName').value = field.name;
                document.getElementById('customFieldValue').value = field.value;
                document.getElementById('saveCustomFieldBtn').dataset.index = index;
                this.openCustomFieldModal();
            });
        });

        container.querySelectorAll('.delete-custom-field-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const index = parseInt(button.dataset.index, 10);
                await CustomFieldsManager.deleteCustomField(index);
                await this.loadCustomFields();
            });
        });
    }

    async saveCustomField() {
        const name = document.getElementById('customFieldName').value.trim();
        const value = document.getElementById('customFieldValue').value.trim();

        if (!name) {
            alert('Field name is required.');
            return;
        }

        const index = document.getElementById('saveCustomFieldBtn').dataset.index;
        if (index !== undefined) {
            const customFields = await CustomFieldsManager.getCustomFields();
            customFields[index] = { name, value };
            await chrome.storage.sync.set({ customFields });
        } else {
            await CustomFieldsManager.saveCustomField({ name, value });
        }

        await this.loadCustomFields();
        this.closeCustomFieldModal();
    }

    renderTalks() {
        const container = document.getElementById('talksContainer');
        if (!container) return;

        container.innerHTML = this.state.talks.map((talk, index) => `
            <div class="talk-item">
                <div class="talk-details">
                    <strong>${talk.title}</strong>&nbsp;(${talk.duration} mins, ${talk.level})
                </div>
                <div>
                    <button class="edit-btn" data-index="${index}">Edit</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners for edit and delete
        container.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.dataset.index, 10);
                const talk = this.state.talks[index];
                document.getElementById('talkTitle').value = talk.title;
                document.getElementById('talkDescription').value = talk.description;
                document.getElementById('talkDuration').value = talk.duration;
                document.getElementById('talkLevel').value = talk.level;
                document.getElementById('saveTalkBtn').dataset.index = index;
                this.openTalkModal();
            });
        });

        container.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const index = parseInt(button.dataset.index, 10);
                this.state.talks.splice(index, 1);
                await chrome.storage.local.set({ talks: this.state.talks });
                this.renderTalks();
            });
        });
    }

    handleAddTalk() {
        document.getElementById('talkTitle').value = '';
        document.getElementById('talkDescription').value = '';
        document.getElementById('talkDuration').value = '';
        document.getElementById('talkLevel').value = 'Beginner';
        delete document.getElementById('saveTalkBtn').dataset.index;
        this.openTalkModal();
    }

    async handleSaveTalk() {
        const title = document.getElementById('talkTitle').value.trim();
        const description = document.getElementById('talkDescription').value.trim();
        const duration = parseInt(document.getElementById('talkDuration').value.trim(), 10);
        const level = document.getElementById('talkLevel').value;

        if (!title) {
            alert('Title is required.');
            return;
        }

        const index = document.getElementById('saveTalkBtn').dataset.index;
        if (index !== undefined) {
            this.state.talks[index] = { title, description, duration, level };
        } else {
            this.state.talks.push({ title, description, duration, level });
        }

        await chrome.storage.local.set({ talks: this.state.talks });
        this.renderTalks();
        this.closeTalkModal();
    }

    async handleDeleteAll() {
        if (confirm('Are you sure you want to delete all talks?')) {
            this.state.talks = [];
            await chrome.storage.local.set({ talks: [] });
            this.renderTalks();
        }
    }

    openTalkModal() {
        document.getElementById('addEditModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    closeTalkModal() {
        document.getElementById('addEditModal').style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    }

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
                level: row[3]?.trim() || 'Beginner',
            })).filter(talk => talk.title); // Filter out rows with empty titles

            if (talks.length === 0) {
                alert('No valid talks found in the uploaded CSV file.');
                document.getElementById('importCsv').value = ''; // Reset file input
                return;
            }

            const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);
            const updatedTalks = [...existingTalks, ...talks];

            await chrome.storage.local.set({ talks: updatedTalks });
            this.loadTalks();

            alert('Talks imported successfully!');
            document.getElementById('importCsv').value = ''; // Reset file input
        };

        reader.readAsText(file);
    }

    handleDownloadTemplate() {
        const csvContent = 'Title,Description,Duration,Level\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'talks_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    openCustomFieldModal() {
        document.getElementById('addCustomFieldModal').style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    closeCustomFieldModal() {
        document.getElementById('addCustomFieldModal').style.display = 'none';
        document.getElementById('modalBackdrop').style.display = 'none';
    }

    async init() {
        await this.loadTalks();
        await this.loadSessionizeUrl();
        await this.loadCustomFields();

        // Other event listeners
        document.getElementById('saveSessionizeBtn').addEventListener('click', this.saveSessionizeUrl);
        document.getElementById('fetchSessionizeBtn').addEventListener('click', this.fetchSessionizeTalks);
        document.getElementById('addTalkBtn').addEventListener('click', this.handleAddTalk);
        document.getElementById('saveTalkBtn').addEventListener('click', this.handleSaveTalk);
        document.getElementById('deleteAllBtn').addEventListener('click', this.handleDeleteAll);
        document.getElementById('addCustomFieldBtn').addEventListener('click', this.openCustomFieldModal.bind(this));
        document.getElementById('saveCustomFieldBtn').addEventListener('click', this.saveCustomField.bind(this));
        document.getElementById('closeCustomFieldModalBtn').addEventListener('click', this.closeCustomFieldModal.bind(this));

        // CSV Import/Upload Event Listener
        document.getElementById('uploadCsvBtn').addEventListener('click', () => {
            const fileInput = document.getElementById('importCsv');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a CSV file before uploading.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result;
                const rows = content.split('\n').map(row => row.split(','));

                const talks = rows.slice(1).map(row => ({
                    title: row[0]?.trim() || '',
                    description: row[1]?.trim() || '',
                    duration: parseInt(row[2]?.trim() || '0', 10),
                    level: row[3]?.trim() || 'Beginner',
                })).filter(talk => talk.title); // Filter out rows with empty titles

                if (talks.length === 0) {
                    alert('No valid talks found in the uploaded CSV file.');
                    fileInput.value = ''; // Reset file input
                    return;
                }

                const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);
                const updatedTalks = [...existingTalks, ...talks];

                await chrome.storage.local.set({ talks: updatedTalks });
                this.loadTalks();

                alert('Talks imported successfully!');
                fileInput.value = ''; // Reset file input
            };

            reader.readAsText(file);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const optionsPage = new OptionsPage();
    optionsPage.init();
});
