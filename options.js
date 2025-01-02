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
                      <span class="edit-custom-field-btn" data-index="${index}" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                          </svg>
                      </span>
                      <span class="delete-custom-field-btn" data-index="${index}" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                              <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                          </svg>
                      </span>
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

      async exportTalksAsJson() {
          const { talks = [] } = await chrome.storage.local.get(['talks']);

          if (!talks.length) {
              alert('No talks available to export.');
              return;
          }

          const blob = new Blob([JSON.stringify(talks, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = 'talks.json';
          a.click();
          URL.revokeObjectURL(url);
      }

      renderTalks() {
          const container = document.getElementById('talksContainer');
          if (!container) return;

          const sortedTalks = this.state.talks.slice().sort((a, b) => a.title.localeCompare(b.title));

          container.innerHTML = sortedTalks.map((talk, index) => `
              <div class="talk-item">
                  <div class="talk-title">
                      <strong>${talk.title}</strong>
                  </div>
                  <div class="talk-details">
                      <p>${talk.description}</p>
                      <p><strong>Duration:</strong> ${talk.duration || 'Unknown'} mins</p>
                      <p><strong>Level:</strong> ${talk.level || 'Beginner'}</p>
                  </div>
                  <div>
                      <span class="edit-btn" data-index="${index}" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
                          </svg>
                      </span>
                      <span class="delete-btn" data-index="${index}" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
                              <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"></path>
                          </svg>
                      </span>
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

      async importTalksFromJson(event) {
          const file = event.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  const importedTalks = JSON.parse(e.target.result);

                  if (!Array.isArray(importedTalks)) {
                      throw new Error('Invalid JSON format. Expected an array of talks.');
                  }

                  const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);
                  const uniqueTalks = importedTalks.filter(newTalk =>
                      !existingTalks.some(existingTalk => existingTalk.title === newTalk.title)
                  );

                  if (uniqueTalks.length > 0) {
                      const updatedTalks = [...existingTalks, ...uniqueTalks];
                      await chrome.storage.local.set({ talks: updatedTalks });
                      this.loadTalks();
                      alert(`${uniqueTalks.length} new talks imported successfully. ${importedTalks.length - uniqueTalks.length} duplicates skipped.`);
                  } else {
                      alert('All imported talks already exist. No new talks were added.');
                  }
              } catch (error) {
                  console.error('Error importing JSON:', error);
                  alert('Failed to import talks. Please ensure the file is a valid JSON.');
              }
          };

          reader.readAsText(file);
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
          document.getElementById('importJsonBtn').addEventListener('click', () => {
              document.getElementById('importJson').click();
          });
          document.getElementById('importJson').addEventListener('change', this.importTalksFromJson.bind(this));
          document.getElementById('exportJsonBtn').addEventListener('click', this.exportTalksAsJson.bind(this));

      }
  }

  document.addEventListener('DOMContentLoaded', () => {
      const optionsPage = new OptionsPage();
      optionsPage.init();
  });
