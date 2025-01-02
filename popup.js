/**
 * Utility function to display custom fields.
 * @param {HTMLElement} container - The container where custom fields are displayed.
 */
async function displayCustomFields(container) {
    const { customFields = [] } = await chrome.storage.sync.get(['customFields']);
    container.innerHTML = '<h3>Custom Fields</h3>'; // Add header for custom fields

    customFields.forEach(field => {
        container.innerHTML += `
            <div class="field-container">
                <span class="field-label">${field.name}: </span>
                <span class="field-content">${field.value}</span>
                <button class="copy-btn" data-value="${field.value}">Copy</button>
                <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
            </div>
        `;
    });

    // Add event listeners for copy buttons
    container.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const valueToCopy = button.getAttribute('data-value');
            copyToClipboard(valueToCopy, button);
        });
    });
}

/**
 * Displays the selected talk's details and custom fields.
 */
async function displaySelectedTalk() {
    const selector = document.getElementById('talkSelector');
    const selectedTitle = selector.value;
    const detailsContainer = document.getElementById('talkDetails');

    // Clear talk details container
    detailsContainer.innerHTML = '<h3>Talk Details</h3>';

    if (!selectedTitle) return;

    const { talks = [] } = await chrome.storage.local.get(['talks']);
    const talk = talks.find(t => t.title === selectedTitle);

    if (!talk) return;

    const orderedFields = ['title', 'description', 'duration', 'level'];
    orderedFields.forEach(field => {
        detailsContainer.innerHTML += `
            <div class="field-container">
                <span class="field-label">${field.charAt(0).toUpperCase() + field.slice(1)}: </span>
                <span class="field-content">${talk[field]}</span>
                <button class="copy-btn" data-value="${talk[field]}">Copy</button>
                <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
            </div>
        `;
    });

    // Add event listeners for copy buttons
    detailsContainer.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const valueToCopy = button.getAttribute('data-value');
            copyToClipboard(valueToCopy, button);
        });
    });
}

/**
 * Loads the saved selected talk from storage.
 * @returns {Promise<string|null>} - The title of the selected talk.
 */
async function loadSelectedTalk() {
    const { selectedTalk } = await chrome.storage.local.get(['selectedTalk']);
    return selectedTalk || null;
}

/**
 * Loads the talk selector dropdown with available talks.
 */
async function loadTalkSelector() {
    const { talks = [] } = await chrome.storage.local.get(['talks']);
    const selector = document.getElementById('talkSelector');
    selector.innerHTML = '<option value="">Select a talk...</option>';

    talks.forEach(talk => {
        const option = document.createElement('option');
        option.value = talk.title;
        option.textContent = talk.title;
        selector.appendChild(option);
    });
}

/**
 * Copies text to clipboard and displays a status message.
 * @param {string} text - The text to copy.
 * @param {HTMLElement} button - The button that triggered the copy action.
 */
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const status = button.nextElementSibling;
        status.style.display = 'inline';
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Error copying to clipboard:', err);
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    const customFieldsContainer = document.getElementById('customFields');
    const detailsContainer = document.getElementById('talkDetails');

    // Always display custom fields
    await displayCustomFields(customFieldsContainer);

    // Load talks into the selector
    await loadTalkSelector();

    // Load persisted selected talk if available
    const selectedTalk = await loadSelectedTalk();
    if (selectedTalk) {
        const selector = document.getElementById('talkSelector');
        selector.value = selectedTalk;
        await displaySelectedTalk();
    }

    // Add event listeners
    document.getElementById('talkSelector').addEventListener('change', displaySelectedTalk);

    document.getElementById('resetView').addEventListener('click', async () => {
        document.getElementById('levelFilter').value = '';
        document.getElementById('durationFilter').value = '';
        const selector = document.getElementById('talkSelector');
        selector.value = '';
        await chrome.storage.local.remove(['selectedTalk']);
        detailsContainer.innerHTML = '<h3>Talk Details</h3>';
        await displayCustomFields(customFieldsContainer); // Reload custom fields
    });

    document.getElementById('optionsLink').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});