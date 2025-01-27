function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('status');
    if (isConnected) {
        statusElement.textContent = 'Status: Connected';
        statusElement.style.backgroundColor = '#e8f5e9';
    } else {
        statusElement.textContent = 'Status: Disconnected';
        statusElement.style.backgroundColor = '#ffebee';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function renderClipboardItems(items) {
    const container = document.getElementById('clipboard-list');
    container.innerHTML = '';

    // Deduplicate items based on server-provided content hash
    const uniqueItems = new Map();
    items.forEach(item => {
        if (item.contentHash && !uniqueItems.has(item.contentHash)) {
            uniqueItems.set(item.contentHash, item);
        }
    });

    // Render unique items
    Array.from(uniqueItems.values()).forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';

        if (item.type === 'TEXT') {
            const textElement = document.createElement('div');
            textElement.className = 'clipboard-text';
            textElement.textContent = item.textContent;
            itemElement.appendChild(textElement);
        } else if (item.type === 'IMAGE') {
            const imgElement = document.createElement('img');
            imgElement.className = 'clipboard-image';
            imgElement.src = `data:image/png;base64,${item.base64BinaryContent}`;
            itemElement.appendChild(imgElement);
        }

        const timestampElement = document.createElement('div');
        timestampElement.className = 'timestamp';
        timestampElement.textContent = formatDate(item.createdAt);
        itemElement.appendChild(timestampElement);

        container.appendChild(itemElement);
    });
}

// Update clipboard items every 2 seconds
setInterval(async () => {
    try {
        const response = await fetch(`http://localhost:8080/api/clipboard`);
        const items = await response.json();
        renderClipboardItems(items);
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Failed to fetch clipboard items:', error);
        updateConnectionStatus(false);
    }
}, 2000);
