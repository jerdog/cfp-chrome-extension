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

function parseCsv(csvContent) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i++; // Skip the next quote
        } else if (char === '"' && !inQuotes) {
            // Start of a quoted field
            inQuotes = true;
        } else if (char === '"' && inQuotes) {
            // End of a quoted field
            inQuotes = false;
        } else if (char === ',' && !inQuotes) {
            // End of a field
            currentRow.push(currentField);
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            // End of a row
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            // Regular character
            currentField += char;
        }
    }

    // Push the last row if not already added
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    return rows;
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

    async exportSettings() {
        const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
        const { customFields = [] } = await chrome.storage.sync.get(['customFields']);
        const { talks = [] } = await chrome.storage.local.get(['talks']);

        const settings = { sessionizeUrl, customFields, talks };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    async importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);

                if (settings.sessionizeUrl) {
                    await chrome.storage.sync.set({ sessionizeUrl: settings.sessionizeUrl });
                }
                if (Array.isArray(settings.customFields)) {
                    await chrome.storage.sync.set({ customFields: settings.customFields });
                }
                if (Array.isArray(settings.talks)) {
                    await chrome.storage.local.set({ talks: settings.talks });
                }

                alert('Settings imported successfully.');
                this.loadTalks();
                this.loadCustomFields();
            } catch (error) {
                alert('Failed to import settings. Please ensure the file is valid JSON.');
                console.error('Error importing settings:', error);
            }
        };

        reader.readAsText(file);
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
        const saveStatusElement = document.getElementById('saveSessionizeUrlStatus');
        saveStatusElement.textContent = '';
        saveStatusElement.style.color = '';

        const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
        if (!sessionizeUrl) {
            saveStatusElement.textContent = 'Please set your Sessionize API URL.';
            saveStatusElement.style.color = 'red';
            return;
        }

        const button = document.getElementById('saveSessionizeBtn');

        if (!sessionizeUrl) {
            saveStatusElement.textContent = 'Sessionize URL cannot be empty.';
            saveStatusElement.style.color = 'red';
            return;
        }

        await chrome.storage.sync.set({ sessionizeUrl });
        saveStatusElement.textContent = 'Sessionize URL saved successfully!';
        saveStatusElement.style.color = 'green';

        setTimeout(() => {
            if (saveStatusElement) {
                saveStatusElement.remove();
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

    async exportTalksAsCsv() {
        const { talks = [] } = await chrome.storage.local.get(['talks']);

        if (!talks.length) {
            alert('No talks available to export.');
            return;
        }

        // Ensure CSV header
        const csvHeader = `"Title","Description","Duration","Level"`;

        // Map talks into CSV rows
        const csvContent = talks.map(talk => {
            const title = talk.title || 'Untitled';
            const description = talk.description || 'No description provided.';
            const duration = talk.duration !== undefined ? talk.duration : 'Unknown';
            const level = talk.level || 'Beginner';

            // Escape quotes and enclose fields in double quotes
            return `"${title.replace(/"/g, '""')}","${description.replace(/"/g, '""')}","${duration}","${level}"`;
        }).join('\n');

        const csv = `${csvHeader}\n${csvContent}`;

        // Create and download the CSV file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'talks.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    renderTalks() {
        const container = document.getElementById('talksContainer');
        if (!container) return;

        // Sort talks alphabetically by title
        const sortedTalks = this.state.talks.slice().sort((a, b) => a.title.localeCompare(b.title));

        container.innerHTML = sortedTalks.map((talk, index) => `
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

            // Parse CSV content
            const rows = parseCsv(content);

            // Validate header
            const [headers, ...dataRows] = rows;
            if (!headers || headers.length < 4 || headers[0] !== 'Title' || headers[1] !== 'Description' || headers[2] !== 'Duration' || headers[3] !== 'Level') {
                alert('Invalid CSV format. Ensure headers are: "Title, Description, Duration, Level".');
                document.getElementById('importCsv').value = ''; // Reset file input
                return;
            }

            // Map rows to talk objects
            const newTalks = dataRows.map(row => ({
                title: row[0] || 'Untitled',
                description: row[1] || 'No description provided.',
                duration: row[2] || 'Unknown',
                level: row[3] || 'Beginner',
            })).filter(talk => talk.title); // Exclude rows with empty titles

            // Check for duplicates
            const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);
            const uniqueTalks = newTalks.filter(newTalk =>
                !existingTalks.some(existingTalk => existingTalk.title === newTalk.title)
            );

            if (uniqueTalks.length > 0) {
                const updatedTalks = [...existingTalks, ...uniqueTalks];
                await chrome.storage.local.set({ talks: updatedTalks });
                this.loadTalks();
                alert(`${uniqueTalks.length} new talks imported successfully. ${newTalks.length - uniqueTalks.length} duplicates skipped.`);
            } else {
                alert('All talks in the CSV already exist. No new talks were added.');
            }

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
        document.getElementById('exportSettingsBtn').addEventListener('click', this.exportSettings);
        document.getElementById('importSettingsBtn').addEventListener('click', () => {
            document.getElementById('importSettingsInput').click();
        });
        document.getElementById('importSettingsInput').addEventListener('change', this.importSettings.bind(this));
        document.getElementById('exportTalksBtn').addEventListener('click', this.exportTalksAsCsv);

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
