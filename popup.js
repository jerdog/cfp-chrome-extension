document.addEventListener('DOMContentLoaded', async () => {
    await loadTalkSelector();

    document.getElementById('fetchSessionize').addEventListener('click', async () => {
        const fetchButton = document.getElementById('fetchSessionize');
        let statusMessage = document.getElementById('fetchStatus');

        if (!statusMessage) {
            statusMessage = document.createElement('span');
            statusMessage.id = 'fetchStatus';
            statusMessage.style.marginLeft = '10px';
            statusMessage.style.fontSize = '0.9em';
            fetchButton.insertAdjacentElement('afterend', statusMessage);
        }

        try {
            const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
            if (!sessionizeUrl) {
                statusMessage.textContent = 'Please set your Sessionize API URL in the settings';
                statusMessage.style.color = 'red';
                return;
            }

            const response = await fetch(sessionizeUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const rawData = await response.json();

            const talks = Array.isArray(rawData) ? rawData : rawData.sessions || [];
            const formattedTalks = talks.map(talk => ({
                title: talk.title || 'Untitled',
                description: talk.description || 'No description provided.',
                duration: parseInt(talk.duration || '0'),
                level: talk.level || 'Beginner',
            }));

            await chrome.storage.local.set({ talks: formattedTalks });
            await loadTalkSelector();

            statusMessage.textContent = `Successfully loaded ${formattedTalks.length} talks`;
            statusMessage.style.color = 'green';
        } catch (error) {
            console.error('Error fetching from Sessionize:', error);
            statusMessage.textContent = 'Failed to fetch talks. Check the URL.';
            statusMessage.style.color = 'red';
        }

        setTimeout(() => {
            statusMessage.textContent = '';
        }, 3000);
    });

    document.getElementById('talkSelector').addEventListener('change', displaySelectedTalk);

    // Link to options page
    document.getElementById('optionsLink').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

});

async function saveSelectedTalk(talkTitle) {
    await chrome.storage.local.set({ selectedTalk: talkTitle });
}

async function loadSelectedTalk() {
    const { selectedTalk } = await chrome.storage.local.get(['selectedTalk']);
    return selectedTalk;
}

async function loadTalkSelector() {
    const { talks = [] } = await chrome.storage.local.get(['talks']);

    const selector = document.getElementById('talkSelector');
    selector.innerHTML = '<option value="">Select a talk...</option>';

    talks.sort((a, b) => a.title.localeCompare(b.title)).forEach(talk => {
        const option = document.createElement('option');
        option.value = talk.title;
        option.textContent = talk.title;
        selector.appendChild(option);
    });
}

async function displaySelectedTalk() {
    const selector = document.getElementById('talkSelector');
    const selectedTitle = selector.value;
    const detailsContainer = document.getElementById('talkDetails');

    if (!selectedTitle) {
        detailsContainer.innerHTML = '';
        return;
    }

    await saveSelectedTalk(selectedTitle);

    const { talks = [] } = await chrome.storage.local.get(['talks']);
    const talk = talks.find(t => t.title === selectedTitle);

    if (!talk) return;

    const orderedFields = ['title', 'description', 'duration', 'level'];
    detailsContainer.innerHTML = orderedFields.map(field => `
        <div class="field-container">
            <div class="field-label">${field.charAt(0).toUpperCase() + field.slice(1)}:</div>
            <div class="field-content">${talk[field]}</div>
            <button class="copy-btn" data-value="${talk[field]}">Copy</button>
            <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
        </div>
    `).join('');

    // Add custom fields
    const { customFields = [] } = await chrome.storage.sync.get(['customFields']);
    customFields.forEach(field => {
        detailsContainer.innerHTML += `
            <div class="field-container">
                <div class="field-label">${field.name}:</div>
                <div class="field-content">${field.value}</div>
                <button class="copy-btn" data-value="${field.value}">Copy</button>
                <span class="copy-status" style="display: none; margin-left: 10px; color: green;">Copied!</span>
            </div>
        `;
    });

    // Add event listeners to the copy buttons
    detailsContainer.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const valueToCopy = button.getAttribute('data-value');
            copyToClipboard(valueToCopy, button);
        });
    });
}

// Load persisted talk on popup open
document.addEventListener('DOMContentLoaded', async () => {
    const selectedTalk = await loadSelectedTalk();
    if (selectedTalk) {
        const selector = document.getElementById('talkSelector');
        selector.value = selectedTalk;
        displaySelectedTalk();
    }
});

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const status = button.nextElementSibling;
        status.style.display = 'inline';
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Error copying to clipboard:', err);
        const status = button.nextElementSibling;
        status.textContent = 'Failed to copy';
        status.style.color = 'red';
        status.style.display = 'inline';
        setTimeout(() => {
            status.style.display = 'none';
            status.textContent = 'Copied!';
            status.style.color = 'green';
        }, 2000);
    });
}

function handleImportCsv(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const rows = content.split('\n').map(row => row.split(','));

        const talks = rows.slice(1).map(row => ({
            title: row[0].trim(),
            description: row[1].trim(),
            duration: parseInt(row[2].trim()),
            level: row[3].trim(),
        })).filter(talk => talk.title);

        const { talks: existingTalks = [] } = await chrome.storage.local.get(['talks']);
        const updatedTalks = [...existingTalks, ...talks];

        await chrome.storage.local.set({ talks: updatedTalks });
        await loadTalkSelector();

        alert('Talks imported successfully!');
    };

    reader.readAsText(file);
}

function handleDownloadTemplate() {
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
