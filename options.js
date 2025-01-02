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
        this.handleImportCsv = this.handleImportCsv.bind(this);
        this.handleDownloadTemplate = this.handleDownloadTemplate.bind(this);
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

    async init() {
        await this.loadTalks();
        await this.loadSessionizeUrl();

        // Other event listeners
        document.getElementById('saveSessionizeBtn').addEventListener('click', this.saveSessionizeUrl);
        document.getElementById('addTalkBtn').addEventListener('click', this.handleAddTalk);
        document.getElementById('deleteAllBtn').addEventListener('click', this.handleDeleteAll);

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
