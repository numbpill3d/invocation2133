/**
 * 🏭 PROMPT ARCHIVE INDUSTRIAL - STORE MANAGER
 * Enhanced data persistence and management system
 */

const Store = require('electron-store');
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class StoreManager {
    constructor() {
        // Initialize the main store for prompts
        this.store = new Store({
            name: 'prompt-archive-data',
            defaults: {
                prompts: [],
                settings: {
                    currentFolder: 'all',
                    activeTags: [],
                    currentView: 'list',
                    currentFilter: 'all',
                    theme: 'industrial-dark',
                    autoSave: true,
                    autoBackup: true,
                    maxBackups: 10
                },
                stats: {
                    totalUsage: 0,
                    sessionCount: 0,
                    lastOpened: new Date().toISOString(),
                    favoriteCount: 0
                }
            },
            cwd: app.getPath('userData'),
            serialize: (value) => JSON.stringify(value, null, 2)
        });

        // Initialize backup store
        this.backupStore = new Store({
            name: 'prompt-archive-backups',
            cwd: path.join(app.getPath('userData'), 'backups')
        });

        // Settings store for application preferences
        this.settingsStore = new Store({
            name: 'app-settings',
            defaults: {
                window: {
                    width: 1400,
                    height: 900,
                    x: null,
                    y: null,
                    maximized: false
                },
                app: {
                    startMinimized: false,
                    minimizeToTray: false,
                    autoLaunch: false,
                    checkUpdates: true,
                    debugMode: false
                }
            }
        });

        this.setupIpcHandlers();
        this.scheduleBackups();
    }

    setupIpcHandlers() {
        // Store operations
        ipcMain.handle('store-get', (event, key, defaultValue) => {
            return this.store.get(key, defaultValue);
        });

        ipcMain.handle('store-set', (event, key, value) => {
            this.store.set(key, value);
            this.updateStats();
            return true;
        });

        ipcMain.handle('store-delete', (event, key) => {
            this.store.delete(key);
            return true;
        });

        ipcMain.handle('store-clear', () => {
            this.store.clear();
            return true;
        });

        ipcMain.handle('store-has', (event, key) => {
            return this.store.has(key);
        });

        ipcMain.handle('store-size', () => {
            return this.store.size;
        });

        // Settings operations
        ipcMain.handle('settings-get', (event, key, defaultValue) => {
            return this.settingsStore.get(key, defaultValue);
        });

        ipcMain.handle('settings-set', (event, key, value) => {
            this.settingsStore.set(key, value);
            return true;
        });

        // Backup operations
        ipcMain.handle('backup-create', () => {
            return this.createBackup();
        });

        ipcMain.handle('backup-restore', (event, backupId) => {
            return this.restoreBackup(backupId);
        });

        ipcMain.handle('backup-list', () => {
            return this.listBackups();
        });

        ipcMain.handle('backup-delete', (event, backupId) => {
            return this.deleteBackup(backupId);
        });

        // Data operations
        ipcMain.handle('data-export', () => {
            return this.exportData();
        });

        ipcMain.handle('data-import', (event, data) => {
            return this.importData(data);
        });

        ipcMain.handle('data-reset', () => {
            return this.resetData();
        });

        // Analytics and stats
        ipcMain.handle('stats-get', () => {
            return this.getStats();
        });

        ipcMain.handle('stats-update', (event, updates) => {
            return this.updateStats(updates);
        });
    }

    updateStats(updates = {}) {
        const currentStats = this.store.get('stats');
        const newStats = {
            ...currentStats,
            ...updates,
            lastModified: new Date().toISOString()
        };

        // Calculate favorite count from prompts
        const prompts = this.store.get('prompts', []);
        newStats.favoriteCount = prompts.filter(p => p.favorite).length;
        newStats.totalPrompts = prompts.length;

        this.store.set('stats', newStats);
        return newStats;
    }

    getStats() {
        return this.store.get('stats');
    }

    createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `backup-${timestamp}`;
            
            const backupData = {
                id: backupId,
                timestamp: new Date().toISOString(),
                data: {
                    prompts: this.store.get('prompts', []),
                    settings: this.store.get('settings', {}),
                    stats: this.store.get('stats', {})
                },
                version: '3.0.0',
                size: JSON.stringify(this.store.store).length
            };

            this.backupStore.set(backupId, backupData);
            
            // Cleanup old backups
            this.cleanupBackups();
            
            return {
                success: true,
                backupId,
                message: 'Backup created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    restoreBackup(backupId) {
        try {
            const backup = this.backupStore.get(backupId);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Create a backup of current state before restoring
            this.createBackup();

            // Restore data
            this.store.set('prompts', backup.data.prompts || []);
            this.store.set('settings', backup.data.settings || {});
            this.store.set('stats', backup.data.stats || {});

            return {
                success: true,
                message: 'Backup restored successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    listBackups() {
        const backups = [];
        for (const [key, value] of Object.entries(this.backupStore.store)) {
            if (key.startsWith('backup-')) {
                backups.push({
                    id: key,
                    timestamp: value.timestamp,
                    size: value.size,
                    promptCount: value.data.prompts ? value.data.prompts.length : 0
                });
            }
        }
        return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    deleteBackup(backupId) {
        try {
            this.backupStore.delete(backupId);
            return {
                success: true,
                message: 'Backup deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    cleanupBackups() {
        const maxBackups = this.store.get('settings.maxBackups', 10);
        const backups = this.listBackups();
        
        if (backups.length > maxBackups) {
            const toDelete = backups.slice(maxBackups);
            toDelete.forEach(backup => {
                this.backupStore.delete(backup.id);
            });
        }
    }

    exportData() {
        try {
            const data = {
                prompts: this.store.get('prompts', []),
                settings: this.store.get('settings', {}),
                stats: this.store.get('stats', {}),
                exported: new Date().toISOString(),
                version: '3.0.0'
            };

            return {
                success: true,
                data: JSON.stringify(data, null, 2),
                filename: `prompt-archive-export-${new Date().toISOString().split('T')[0]}.json`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.prompts || !Array.isArray(data.prompts)) {
                throw new Error('Invalid data format: missing or invalid prompts array');
            }

            // Create backup before import
            this.createBackup();

            // Import data
            const currentPrompts = this.store.get('prompts', []);
            const maxId = Math.max(...currentPrompts.map(p => p.id), 0);
            
            // Assign new IDs to imported prompts
            const importedPrompts = data.prompts.map((prompt, index) => ({
                ...prompt,
                id: maxId + index + 1,
                imported: new Date().toISOString()
            }));

            // Merge with existing prompts
            const allPrompts = [...currentPrompts, ...importedPrompts];
            this.store.set('prompts', allPrompts);

            // Update settings if provided
            if (data.settings) {
                const currentSettings = this.store.get('settings', {});
                this.store.set('settings', { ...currentSettings, ...data.settings });
            }

            this.updateStats();

            return {
                success: true,
                imported: importedPrompts.length,
                total: allPrompts.length,
                message: `Successfully imported ${importedPrompts.length} prompts`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    resetData() {
        try {
            // Create backup before reset
            this.createBackup();
            
            // Reset to defaults
            this.store.clear();
            
            return {
                success: true,
                message: 'Data reset successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    scheduleBackups() {
        const settings = this.store.get('settings');
        
        if (settings.autoBackup) {
            // Create backup every hour
            setInterval(() => {
                this.createBackup();
            }, 60 * 60 * 1000);
            
            // Initial backup on startup
            setTimeout(() => {
                this.createBackup();
            }, 5000);
        }
    }

    // Window state management
    saveWindowState(window) {
        const bounds = window.getBounds();
        const isMaximized = window.isMaximized();
        
        this.settingsStore.set('window', {
            ...bounds,
            maximized: isMaximized
        });
    }

    getWindowState() {
        return this.settingsStore.get('window');
    }

    // Migration utilities
    migrateData(fromVersion, toVersion) {
        // Implement data migration logic here
        console.log(`Migrating data from ${fromVersion} to ${toVersion}`);
        
        // Example migration
        if (fromVersion < '3.0.0') {
            const prompts = this.store.get('prompts', []);
            const updatedPrompts = prompts.map(prompt => ({
                ...prompt,
                rating: prompt.rating || 0,
                favorite: prompt.favorite || false
            }));
            this.store.set('prompts', updatedPrompts);
        }
    }

    // Integrity checks
    validateData() {
        const prompts = this.store.get('prompts', []);
        const issues = [];

        prompts.forEach((prompt, index) => {
            if (!prompt.id) {
                issues.push(`Prompt at index ${index} missing ID`);
            }
            if (!prompt.title || !prompt.content) {
                issues.push(`Prompt at index ${index} missing title or content`);
            }
            if (!Array.isArray(prompt.tags)) {
                issues.push(`Prompt at index ${index} has invalid tags`);
            }
        });

        return {
            valid: issues.length === 0,
            issues,
            promptCount: prompts.length
        };
    }

    // Cleanup and maintenance
    performMaintenance() {
        this.cleanupBackups();
        this.validateData();
        
        // Update session count
        const stats = this.getStats();
        this.updateStats({
            sessionCount: (stats.sessionCount || 0) + 1,
            lastOpened: new Date().toISOString()
        });
    }
}

module.exports = StoreManager;