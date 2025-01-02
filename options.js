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
      this.state = {
          talks: [],
          customFields: []
      };

      // Bind methods
      this.loadTalks = this.loadTalks.bind(this);
      this.setupDynamicListeners = this.setupDynamicListeners.bind(this);
      this.saveSettings = this.saveSettings.bind(this);
      this.loadSettings = this.loadSettings.bind(this);
      this.handleSelectAll = this.handleSelectAll.bind(this);
      this.handleDeleteSelected = this.handleDeleteSelected.bind(this);
      this.handleCustomFieldAdd = this.handleCustomFieldAdd.bind(this);
      this.handleModalClose = this.handleModalClose.bind(this);
      this.handleAddFieldSubmit = this.handleAddFieldSubmit.bind(this);
  }

  async loadTalks() {
      try {
          const { talks = [] } = await chrome.storage.local.get(['talks']);
          this.state.talks = talks;
          this.renderTalks();
      } catch (error) {
          console.error('Error loading talks:', error);
      }
  }

  async loadSettings() {
      try {
          const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
          if (sessionizeUrl) {
              document.getElementById('sessionizeUrl').value = sessionizeUrl;
          }
      } catch (error) {
          console.error('Error loading settings:', error);
      }
  }

  saveSettings() {
      const sessionizeUrl = document.getElementById('sessionizeUrl').value;
      if (!sessionizeUrl) {
          console.error('Sessionize URL cannot be empty.');
          return;
      }

      chrome.storage.sync.set({ sessionizeUrl }, () => {
          console.log('Sessionize URL saved:', sessionizeUrl);
          alert('Settings saved!');
      });
  }

  renderTalks() {
      const container = document.getElementById('talksContainer');
      if (!container) return;

      container.innerHTML = this.generateTalksTable(this.state.talks);
      this.setupDynamicListeners(); // Attach listeners for dynamically rendered elements
  }

  generateTalksTable(talks) {
      return `
          <table class="talks-table">
              <thead>
                  <tr>
                      <th><input type="checkbox" id="selectAll"></th>
                      <th>Title</th>
                      <th>Level</th>
                      <th>Duration</th>
                      <th>Actions</th>
                  </tr>
              </thead>
              <tbody>
                  ${talks.map((talk, index) => `
                      <tr>
                          <td><input type="checkbox" class="talk-select" data-index="${index}"></td>
                          <td>${talk.title}</td>
                          <td>${talk.level}</td>
                          <td>${talk.duration}</td>
                          <td><button class="edit-button" data-index="${index}">Edit</button></td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      `;
  }

  setupDynamicListeners() {
      const container = document.getElementById('talksContainer');
      if (!container) return;

      container.querySelectorAll('.talk-select').forEach(checkbox => {
          checkbox.addEventListener('change', this.updateSelectedCount);
      });

      container.querySelectorAll('.edit-button').forEach(button => {
          const index = button.dataset.index;
          button.addEventListener('click', () => this.editTalk(index));
      });
  }

  handleSelectAll(e) {
      const checkboxes = document.querySelectorAll('.talk-select');
      checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
      this.updateSelectedCount();
  }

  async handleDeleteSelected() {
      const selectedIndices = Array.from(
          document.querySelectorAll('.talk-select:checked')
      ).map(checkbox => parseInt(checkbox.dataset.index));

      if (selectedIndices.length === 0) {
          ErrorHandler.showError('No talks selected');
          return;
      }

      if (confirm(`Delete ${selectedIndices.length} selected talks?`)) {
          await TalkManager.deleteTalks(selectedIndices);
          await this.loadTalks();
      }
  }

  handleCustomFieldAdd() {
      const modal = document.getElementById('addFieldModal');
      const backdrop = document.getElementById('modalBackdrop');
      modal.style.display = 'block';
      backdrop.style.display = 'block';
  }

  handleModalClose() {
      const modal = document.getElementById('addFieldModal');
      const backdrop = document.getElementById('modalBackdrop');
      modal.style.display = 'none';
      backdrop.style.display = 'none';
  }

  async handleAddFieldSubmit(e) {
      e.preventDefault();
      const fieldName = document.getElementById('fieldName').value;
      const fieldDefaultValue = document.getElementById('fieldDefaultValue').value;
      const { customFields = [] } = await chrome.storage.sync.get(['customFields']);
      customFields.push({ name: fieldName, defaultValue: fieldDefaultValue });
      await chrome.storage.sync.set({ customFields });
      await this.loadCustomFields();
      this.handleModalClose();
  }

  async loadCustomFields() {
      const { customFields = [] } = await chrome.storage.sync.get(['customFields']);
      const container = document.getElementById('customFieldsList');

      if (!container) return;

      container.innerHTML = customFields.map((field, index) => `
          <div class="custom-field" data-index="${index}">
              <span>${field.name}: ${field.defaultValue}</span>
              <button class="delete-field-btn" data-index="${index}">Delete</button>
          </div>
      `).join('');
  }

  updateSelectedCount() {
      const selectedCount = document.querySelectorAll('.talk-select:checked').length;
      const countDisplay = document.getElementById('selectedCount');
      const deleteButton = document.getElementById('deleteSelected');

      if (countDisplay) {
          countDisplay.textContent = `${selectedCount} talk(s) selected`;
      }

      if (deleteButton) {
          deleteButton.disabled = selectedCount === 0;
      }
  }

  async init() {
      try {
          await this.loadSettings();
          await this.loadTalks();

          document.getElementById('save').addEventListener('click', this.saveSettings);
          document.getElementById('addCustomField')?.addEventListener('click', this.handleCustomFieldAdd);
          document.getElementById('closeModal')?.addEventListener('click', this.handleModalClose);
          document.getElementById('addFieldForm')?.addEventListener('submit', this.handleAddFieldSubmit);
      } catch (error) {
          console.error('Initialization error:', error);
      }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const optionsPage = new OptionsPage();
  optionsPage.init().catch(console.error);
});
