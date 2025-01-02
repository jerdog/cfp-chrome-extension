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
                <span class="copy-icon" data-value="${field.value}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>
                </span>
                <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
            </div>
        `;
    });

    // Add event listeners for copy icons
    container.querySelectorAll('.copy-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const valueToCopy = icon.getAttribute('data-value');
            copyToClipboard(valueToCopy, icon);
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
        const fieldValue = talk[field] !== undefined ? talk[field] : 'N/A'; // Handle undefined values
        detailsContainer.innerHTML += `
            <div class="field-container">
                <span class="field-label">${field.charAt(0).toUpperCase() + field.slice(1)}: </span>
                <span class="field-content">${fieldValue}</span>
                <span class="talk-copy-icon" data-value="${fieldValue}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>
                </span>
                <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
            </div>
        `;
    });

    // Add event listeners for copy icons
    detailsContainer.querySelectorAll('.talk-copy-icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const valueToCopy = icon.getAttribute('data-value');
            copyToClipboard(valueToCopy, icon);
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
    const talkSelector = document.getElementById('talkSelector');
    const levelFilter = document.getElementById('levelFilter');
    const durationFilter = document.getElementById('durationFilter');

    // Always display custom fields
    if (customFieldsContainer) {
        await displayCustomFields(customFieldsContainer);
    }

    // Load talks into the selector
    const { talks = [] } = await chrome.storage.local.get(['talks']); // Ensure talks are fetched
    if (talks.length > 0) {
        updateTalkSelector(talks);
    }

    // Load persisted selected talk if available
    const selectedTalk = await loadSelectedTalk();
    if (selectedTalk) {
        talkSelector.value = selectedTalk;
        await displaySelectedTalk();
    }

    // Add event listeners
    talkSelector.addEventListener('change', displaySelectedTalk);

    document.getElementById('resetView').addEventListener('click', async () => {
        levelFilter.value = '';
        durationFilter.value = '';
        talkSelector.value = '';
        await chrome.storage.local.remove(['selectedTalk']);
        detailsContainer.innerHTML = ''; // Clear talk details
        if (customFieldsContainer) {
            await displayCustomFields(customFieldsContainer); // Reload custom fields
        }
        updateTalkSelector(talks); // Reset the dropdown
    });

    levelFilter.addEventListener('change', () => {
        applyFilters(talks);
    });

    durationFilter.addEventListener('change', () => {
        applyFilters(talks);
    });

    document.getElementById('optionsLink').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    /**
     * Filters the talks based on level and duration and updates the dropdown.
     * @param {Array} talks - Array of all available talks.
     */
    function applyFilters(talks) {
        if (!Array.isArray(talks)) {
            console.error('Invalid talks array passed to applyFilters.');
            return;
        }

        const levelFilterValue = levelFilter.value;
        const durationFilterValue = durationFilter.value;

        const filteredTalks = talks.filter(talk => {
            const matchesLevel = !levelFilterValue || talk.level === levelFilterValue;
            const matchesDuration = !durationFilterValue || String(talk.duration) === durationFilterValue;
            return matchesLevel && matchesDuration;
        });

        updateTalkSelector(filteredTalks);
    }

    /**
     * Updates the talk selector dropdown with the given talks.
     * @param {Array} talks - Array of talks to display in the dropdown.
     */
    function updateTalkSelector(talks) {
        if (!Array.isArray(talks)) {
            console.error('Invalid talks array passed to updateTalkSelector.');
            return;
        }

        talkSelector.innerHTML = '<option value="">Select a talk...</option>'; // Reset options

        talks.forEach(talk => {
            const option = document.createElement('option');
            option.value = talk.title;
            option.textContent = talk.title;
            talkSelector.appendChild(option);
        });
    }
});