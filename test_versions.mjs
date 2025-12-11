console.log('Versions:', process.versions);
try {
    import('electron').then(electron => {
        console.log('Electron module keys:', Object.keys(electron));
        console.log('Is App defined:', !!electron.app);
        console.log('Is default App defined:', !!electron.default?.app);
    }).catch(err => {
        console.error('Import error:', err);
    });
} catch (e) {
    console.error('Error:', e);
}
