import React, { useState } from 'react';
import { useFeature } from '../context/FeatureContext';
import { useToast } from './Toast';
import LicenseManager from '../utils/LicenseManager';

const ActivationModal = ({ onClose, isDark }) => {
    const { upgradeTier } = useFeature();
    const toast = useToast();
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleActivate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate format first
            const validation = LicenseManager.validateLicenseKey(key);
            if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid license key');
            }

            // Attempt activation via FeatureContext (which calls LicenseManager.activateLicense)
            await upgradeTier(validation.tier, key);

            toast.success('License activated successfully!');
            onClose();
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#252526' : '#f8f9fa';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
                <div className="p-6 border-b flex justify-between items-center" style={{ borderColor }}>
                    <div>
                        <h2 className="text-xl font-bold">Activate License</h2>
                        <p className="opacity-70 text-sm">Enter your product key to unlock features.</p>
                    </div>
                    <button onClick={onClose} className="text-2xl opacity-50 hover:opacity-100">&times;</button>
                </div>

                <form onSubmit={handleActivate} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">License Key</label>
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value.toUpperCase());
                                setError(null);
                            }}
                            placeholder="PW-PRO-XXXX-XXXX"
                            className="w-full p-3 rounded border font-mono text-center tracking-widest uppercase"
                            style={{
                                backgroundColor: inputBg,
                                color: textColor,
                                borderColor: error ? '#ef4444' : borderColor
                            }}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-sm font-semibold opacity-70 hover:opacity-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !key}
                            className="px-6 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin">⌛</span> Validating...
                                </>
                            ) : (
                                'Activate'
                            )}
                        </button>
                    </div>
                </form>

                <div className="p-4 border-t text-center text-xs opacity-50 bg-opacity-10" style={{ borderColor, backgroundColor: inputBg }}>
                    Need a license? Visit pocketwall.app/pricing
                </div>
            </div>
        </div>
    );
};

export default ActivationModal;
