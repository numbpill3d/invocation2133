const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', callback);
  },

  // Import/Export
  exportData: (data) => {
    return ipcRenderer.invoke('export-data', data);
  },

  onImportData: (callback) => {
    ipcRenderer.on('import-data', callback);
  },

  // File system operations (secure)
  readFile: async (filePath, options = {}) => {
    // This would typically be handled differently in a real app
    // For security, you'd want to validate and sanitize file paths
    return ipcRenderer.invoke('read-file', filePath, options);
  },

  // System info
  platform: process.platform,
  
  // App info
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
  },

  // Notifications
  showNotification: (title, body) => {
    return ipcRenderer.invoke('show-notification', title, body);
  },

  // Window controls
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window');
  },

  maximizeWindow: () => {
    ipcRenderer.send('maximize-window');
  },

  closeWindow: () => {
    ipcRenderer.send('close-window');
  },

  isMaximized: () => {
    return ipcRenderer.invoke('is-maximized');
  },

  // Theme
  setNativeTheme: (theme) => {
    ipcRenderer.send('set-native-theme', theme);
  },

  // Storage (using electron-store)
  store: {
    get: (key, defaultValue) => {
      return ipcRenderer.invoke('store-get', key, defaultValue);
    },
    
    set: (key, value) => {
      return ipcRenderer.invoke('store-set', key, value);
    },
    
    delete: (key) => {
      return ipcRenderer.invoke('store-delete', key);
    },
    
    clear: () => {
      return ipcRenderer.invoke('store-clear');
    },
    
    has: (key) => {
      return ipcRenderer.invoke('store-has', key);
    },
    
    size: () => {
      return ipcRenderer.invoke('store-size');
    }
  }
});

// DOM Content Loaded listener
document.addEventListener('DOMContentLoaded', () => {
  // Add platform-specific classes
  document.body.classList.add(`platform-${process.platform}`);
  
  // Add Electron-specific styling
  document.body.classList.add('electron-app');
  
  // Handle menu actions
  window.electronAPI.onMenuAction((event, action) => {
    switch (action) {
      case 'new-prompt':
        if (window.createNewPrompt) {
          window.createNewPrompt();
        }
        break;
      case 'save-prompt':
        if (window.savePrompt) {
          window.savePrompt();
        }
        break;
      case 'find':
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        break;
      case 'toggle-sidebar':
        if (window.toggleSidebar) {
          window.toggleSidebar();
        }
        break;
      case 'grid-view':
        if (window.setView) {
          window.setView('grid');
        }
        break;
      case 'list-view':
        if (window.setView) {
          window.setView('list');
        }
        break;
      case 'show-shortcuts':
        if (window.showShortcuts) {
          window.showShortcuts();
        }
        break;
      case 'export-prompts':
        if (window.exportDataElectron) {
          window.exportDataElectron();
        }
        break;
    }
  });

  // Handle import data
  window.electronAPI.onImportData((event, data) => {
    if (window.importDataElectron) {
      window.importDataElectron(data);
    }
  });

  // Handle window state changes
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', callback);
  },
});

// Console styling for Electron
console.log(
  '%c🏭 PROMPT ARCHIVE INDUSTRIAL %c v3.0 %c ELECTRON EDITION',
  'background: linear-gradient(90deg, #0a0a0a, #1a1a1a); color: #87CEEB; padding: 4px 8px; font-weight: bold;',
  'background: #87CEEB; color: #000; padding: 4px 8px; font-weight: bold;',
  'background: linear-gradient(90deg, #1a1a1a, #0a0a0a); color: #87CEEB; padding: 4px 8px; font-weight: bold;'
);