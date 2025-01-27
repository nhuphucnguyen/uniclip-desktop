function updateConnectionStatus(isConnected) {
    const statusDot = document.getElementById('status-dot');
    if (isConnected) {
        statusDot.classList.add('connected');
    } else {
        statusDot.classList.remove('connected');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Keep track of rendered items to avoid unnecessary re-renders
let renderedItems = new Map();

function renderClipboardItems(items) {
    const container = document.getElementById('clipboard-list');
    
    // Clear the container and rendered items map
    container.innerHTML = '';
    renderedItems.clear();
    
    // Render items in order
    items.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'clipboard-item';
        
        let content;
        if (item.type === 'TEXT') {
            content = `<div class="clipboard-text">${item.textContent || ''}</div>`;
        } else if (item.type === 'IMAGE' && item.base64BinaryContent) {
            content = `<img class="clipboard-image" src="data:image/png;base64,${item.base64BinaryContent}" />`;
        } else {
            content = `<div class="clipboard-text error">Invalid or missing content</div>`;
        }
        
        // Update content
        itemElement.innerHTML = `
            ${content}
            <div class="timestamp">${formatDate(item.updatedAt)}</div>
        `;
        
        // Add to container and track in map
        container.appendChild(itemElement);
        renderedItems.set(item.contentHash, itemElement);
    });
}

// Fetch clipboard items
async function fetchClipboardItems() {
    try {
        const response = await fetch('http://localhost:8080/api/clipboard');
        const items = await response.json();
        console.log('Fetched items:', items.map(item => ({
            type: item.type,
            contentHash: item.contentHash,
            hasTextContent: !!item.textContent,
            hasBase64Content: !!item.base64BinaryContent
        })));
        renderClipboardItems(items);
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Failed to fetch clipboard items:', error);
        updateConnectionStatus(false);
    }
}

// Initial fetch
fetchClipboardItems();

// Add refresh button click handler
document.getElementById('refresh-button').addEventListener('click', fetchClipboardItems);

// Listen for refresh events from the main process
const { ipcRenderer } = require('electron');
ipcRenderer.on('refresh-list', () => {
    fetchClipboardItems();
});
