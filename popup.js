document.addEventListener('DOMContentLoaded', async () => {
    await loadTalkSelector();

    document.getElementById('fetchSessionize').addEventListener('click', async () => {
        try {
            const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
            if (!sessionizeUrl) {
                alert('Please set your Sessionize API URL in the extension settings first');
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
            alert(`Successfully loaded ${formattedTalks.length} talks`);
        } catch (error) {
            console.error('Error fetching from Sessionize:', error);
            alert('Failed to fetch talks from Sessionize. Check the URL and try again.');
        }
    });

    document.getElementById('talkSelector').addEventListener('change', displaySelectedTalk);
});

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

    // Add event listeners to the copy buttons
    detailsContainer.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', () => {
            const valueToCopy = button.getAttribute('data-value');
            copyToClipboard(valueToCopy, button);
        });
    });
}

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



