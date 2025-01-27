const { ipcRenderer, clipboard, nativeImage } = require('electron');

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
        
        // Add copy button
        const copyButton = `
            <button class="copy-button" title="Copy to clipboard">
                <svg viewBox="0 0 16 16">
                    <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z" fill="currentColor"/>
                </svg>
            </button>
        `;
        
        // Update content
        itemElement.innerHTML = `
            ${content}
            ${copyButton}
            <div class="timestamp">${formatDate(item.updatedAt)}</div>
        `;
        
        // Add click handler for copy button
        const button = itemElement.querySelector('.copy-button');
        button.addEventListener('click', () => {
            if (item.type === 'TEXT') {
                clipboard.writeText(item.textContent || '');
            } else if (item.type === 'IMAGE' && item.base64BinaryContent) {
                const buffer = Buffer.from(item.base64BinaryContent, 'base64');
                const image = nativeImage.createFromBuffer(buffer);
                clipboard.writeImage(image);
            }
        });
        
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
ipcRenderer.on('refresh-list', () => {
    fetchClipboardItems();
});
