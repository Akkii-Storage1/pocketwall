
const LICENSE_SALT = 'POCKETWALL_SECURE_SALT_2024_v1';

const TIERS_MAP = {
    'STR': 'starter',
    'PRO': 'pro',
    'ELT': 'elite'
};

const REVERSE_TIERS_MAP = {
    'starter': 'STR',
    'pro': 'PRO',
    'elite': 'ELT'
};

function _generateChecksum(tierCode, batchId, duration) {
    const data = `${tierCode}-${duration}-${batchId}-${LICENSE_SALT}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and take last 4 chars
    return Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
}

function generateLicenseKey(tier, duration) {
    const tierCode = REVERSE_TIERS_MAP[tier];
    if (!tierCode) throw new Error('Invalid tier');

    // Generate random 4-char batch ID
    const batchId = Math.random().toString(36).substring(2, 6).toUpperCase();

    const checksum = _generateChecksum(tierCode, batchId, duration);

    return `PW-${tierCode}-${duration}-${batchId}-${checksum}`;
}

const tiers = ['starter', 'pro', 'elite'];
const durations = ['1M', '3M', '6M', '12M'];

console.log('| Tier | Duration | Key 1 | Key 2 | Key 3 |');
console.log('|---|---|---|---|---|');

tiers.forEach(tier => {
    durations.forEach(duration => {
        const k1 = generateLicenseKey(tier, duration);
        const k2 = generateLicenseKey(tier, duration);
        const k3 = generateLicenseKey(tier, duration);
        console.log(`| ${tier.toUpperCase()} | ${duration} | ${k1} | ${k2} | ${k3} |`);
    });
});
