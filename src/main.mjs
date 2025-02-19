import { app, BrowserWindow, clipboard, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import Store from 'electron-store';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = await import('./config.js').then(m => m.default);

const store = new Store();
let mainWindow;
let tray;
let previousTextContent = '';
let previousImageContent = '';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,  // Changed to be more compact
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: true  // Show window on startup for debugging
    });

    const indexPath = path.join(__dirname, 'renderer', 'index.html');
    mainWindow.loadFile(indexPath).catch(console.error);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    // Hide menu bar
    mainWindow.setMenuBarVisibility(false);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    // Create a simple 16x16 png icon as a fallback
    let iconPath;
    try {
        // Try custom icon first
        iconPath = path.join(__dirname, '../assets/icon.png');
        // Verify if file exists and is accessible
        if (!fs.existsSync(iconPath)) {
            // Fallback to default system tray icon
            if (process.platform === 'darwin') {
                iconPath = path.join(__dirname, '../assets/icon-template.png');
            } else {
                iconPath = path.join(__dirname, '../assets/icon-small.png');
            }
        }
    } catch (error) {
        console.error('Error resolving icon path:', error);
        // Final fallback - use a 10x10 transparent PNG as icon
        iconPath = path.join(__dirname, '../assets/fallback.png');
    }

    try {
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            { 
                label: 'Show History', 
                click: () => {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
            { label: 'Quit', click: () => app.quit() }
        ]);
        tray.setToolTip('Universal Clipboard');
        tray.setContextMenu(contextMenu);
        
        // Show window when clicking the tray icon
        tray.on('click', () => {
            mainWindow.show();
            mainWindow.focus();
        });
    } catch (error) {
        console.error('Failed to create tray:', error);
        // Create a minimal 10x10 transparent PNG file for the tray icon
        const canvas = createCanvas(10, 10);
        const ctx = canvas.getContext('2d');
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(__dirname, '../assets/fallback.png'), buffer);
        // Try one more time with the fallback icon
        tray = new Tray(path.join(__dirname, '../assets/fallback.png'));
    }
}

function calculateHash(type, content) {
    const hash = crypto.createHash('sha256');
    if (type === 'TEXT') {
        hash.update(content || '');
    } else if (type === 'IMAGE') {
        // For base64 content, convert to buffer first
        const buffer = Buffer.from(content || '', 'base64');
        hash.update(buffer);
    }
    return hash.digest('hex');
}

function monitorClipboard() {
    setInterval(async () => {
        const currentText = clipboard.readText();
        const currentImage = clipboard.readImage('clipboard');

        let hasNewContent = false;
        let payload = {
            type: 'TEXT',
            textContent: null,
            binaryContent: null
        };

        // Check for new text content
        if (currentText && currentText !== previousTextContent) {
            hasNewContent = true;
            previousTextContent = currentText;
            previousImageContent = ''; // Reset image tracking when text is copied
            payload.type = 'TEXT';
            payload.textContent = currentText;
        } 
        // Only check image if there's no new text content
        else if (!currentImage.isEmpty()) {
            const pngBuffer = currentImage.toPNG();
            if (pngBuffer.length > 0) {
                const base64Image = pngBuffer.toString('base64');
                if (base64Image !== previousImageContent) {
                    hasNewContent = true;
                    previousImageContent = base64Image;
                    previousTextContent = ''; // Reset text tracking when image is copied
                    payload.type = 'IMAGE';
                    payload.binaryContent = base64Image;
                }
            }
        }

        if (hasNewContent) {
            try {
                // Calculate hash using the same algorithm as server
                const hash = calculateHash(
                    payload.type,
                    payload.type === 'TEXT' ? payload.textContent : payload.binaryContent
                );

                try {
                    // Try to update timestamp first
                    await axios.put(`${config.serverUrl}${config.apiEndpoints.touch(hash)}`);
                    if (mainWindow) mainWindow.webContents.send('refresh-list');
                } catch (error) {
                    if (error.response?.status === 404) {
                        // If item doesn't exist, create it
                        await axios.post(`${config.serverUrl}${config.apiEndpoints.clipboard}`, payload);
                        if (mainWindow) mainWindow.webContents.send('refresh-list');
                    } else {
                        console.error('Failed to sync clipboard:', error);
                    }
                }
            } catch (error) {
                console.error('Failed to sync clipboard:', error);
            }
        }
    }, 1000);
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    monitorClipboard();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (!mainWindow) {
        createWindow();
    }
});
