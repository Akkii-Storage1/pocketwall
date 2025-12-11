console.log('Versions:', process.versions);
try {
    const electron = require('electron');
    console.log('Electron module type:', typeof electron);
    console.log('Electron module keys:', Object.keys(electron));
    console.log('Is App defined:', !!electron.app);
} catch (e) {
    console.error('Error requiring electron:', e);
}
