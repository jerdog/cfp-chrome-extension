document.addEventListener('DOMContentLoaded', async () => {
    // Load talks when the popup is opened
    await loadTalkSelector();

    // Add event listener for the "Fetch from Sessionize" button
    document.getElementById('fetchSessionize').addEventListener('click', async () => {
        try {
            const { sessionizeUrl } = await chrome.storage.sync.get(['sessionizeUrl']);
            console.log('Retrieved sessionizeUrl:', sessionizeUrl);

            if (!sessionizeUrl) {
                alert('Please set your Sessionize API URL in the extension settings first');
                return;
            }

            const response = await fetch(sessionizeUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const rawData = await response.json();
            console.log('Raw Sessionize data:', rawData);

            // Transform Sessionize data into the expected format
            const talks = Array.isArray(rawData) ? rawData :
                Array.isArray(rawData.sessions) ? rawData.sessions : [];

            const formattedTalks = talks.map(talk => ({
                title: talk.title || 'Untitled',
                description: talk.description || 'No description provided.',
                duration: parseInt(talk.duration || '0'),
                level: talk.level || 'Beginner',
            }));

            console.log('Formatted talks:', formattedTalks);

            // Save the talks to local storage
            await chrome.storage.local.set({ talks: formattedTalks });
            await loadTalkSelector();
            alert(`Successfully loaded ${formattedTalks.length} talks`);
        } catch (error) {
            console.error('Error fetching from Sessionize:', error);
            alert('Failed to fetch talks from Sessionize. Check the URL and try again.');
        }
    });

    // Add filter change handlers
    document.getElementById('levelFilter').addEventListener('change', loadTalkSelector);
    document.getElementById('durationFilter').addEventListener('change', loadTalkSelector);
});

// Helper functions
async function loadTalkSelector() {
    const { talks = [] } = await chrome.storage.local.get(['talks']);
    console.log('Loaded talks:', talks);

    if (!Array.isArray(talks)) {
        console.error('Talks is not an array:', talks);
        return;
    }

    const selector = document.getElementById('talkSelector');
    selector.innerHTML = '<option value="">Select a talk...</option>';

    talks.sort((a, b) => a.title.localeCompare(b.title)).forEach(talk => {
        const option = document.createElement('option');
        option.value = talk.title;
        option.textContent = talk.title;
        selector.appendChild(option);
    });

    selector.addEventListener('change', displaySelectedTalk);
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

    detailsContainer.innerHTML = `
        <div>
            <strong>Title:</strong> ${talk.title}<br>
            <strong>Description:</strong> ${talk.description}<br>
            <strong>Duration:</strong> ${talk.duration} mins<br>
            <strong>Level:</strong> ${talk.level}
        </div>
    `;
}
