import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showVerificationScreen, setShowVerificationScreen] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    // Theme detection
    const getTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };

    const isDark = getTheme() === 'dark';

    const colors = isDark ? {
        bg: '#1e1e1e',
        panel: '#252526',
        border: '#3e3e42',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.7)',
        inputBg: '#1e1e1e',
        headerBg: 'linear-gradient(180deg, #2d2d30 0%, #252526 100%)',
        footerBg: '#2d2d30'
    } : {
        bg: '#f0f0f0',
        panel: '#ffffff',
        border: '#d4d4d4',
        text: '#1a1a1a',
        textMuted: 'rgba(0,0,0,0.6)',
        inputBg: '#ffffff',
        headerBg: 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%)',
        footerBg: '#f5f5f5'
    };
    const accentColor = '#0078d4';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await signup(email, password);
            setShowVerificationScreen(true);
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak.');
            } else {
                setError(err.message);
            }
        }
        setLoading(false);
    };

    const handleGoogleSignup = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            if (err.message !== 'GOOGLE_AUTH_REDIRECT') {
                setError('Google sign-up failed.');
            }
        }
        setLoading(false);

        // Force focus restoration after popup closes
        setTimeout(() => {
            document.body.style.display = 'none';
            document.body.offsetHeight;
            document.body.style.display = '';
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) emailInput.focus();
        }, 100);
    };

    // Verification Screen
    if (showVerificationScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ backgroundColor: colors.bg, fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
                <div className="w-full max-w-md rounded-lg shadow-2xl overflow-hidden text-center"
                    style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}` }}>

                    <div className="px-6 py-6" style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg }}>
                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
                            <span className="text-3xl">📧</span>
                        </div>
                        <h2 className="text-xl font-semibold" style={{ color: colors.text }}>Verify Your Email</h2>
                    </div>

                    <div className="p-6">
                        <p className="text-sm mb-2" style={{ color: colors.textMuted }}>We've sent a verification link to:</p>
                        <p className="font-medium mb-6" style={{ color: accentColor }}>{email}</p>

                        <div className="p-4 rounded mb-6 text-left"
                            style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                            <p className="text-sm mb-2" style={{ color: '#93c5fd' }}>📌 <strong>Next Steps:</strong></p>
                            <ol className="text-xs list-decimal ml-4 space-y-1" style={{ color: colors.textMuted }}>
                                <li>Check your inbox</li>
                                <li>Click the verification link</li>
                                <li>Return here and sign in</li>
                            </ol>
                            <p className="text-xs mt-3" style={{ color: colors.textMuted }}>💡 Check spam folder</p>
                        </div>

                        <Link to="/login" className="block w-full py-2.5 rounded text-sm font-semibold mb-3"
                            style={{ backgroundColor: accentColor, color: 'white', textDecoration: 'none' }}>
                            Go to Sign In
                        </Link>
                        <button onClick={() => setShowVerificationScreen(false)}
                            className="w-full py-2 rounded text-sm"
                            style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.text }}>
                            Use Different Email
                        </button>
                    </div>

                    <div className="px-6 py-3 text-xs" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.footerBg, color: colors.textMuted }}>
                        🎁 7-day free Pro trial activated!
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: colors.bg, fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
            <div className="w-full max-w-md rounded-lg shadow-2xl overflow-hidden"
                style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}` }}>

                {/* Header */}
                <div className="px-6 py-4 text-center" style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg }}>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: accentColor }}>P</div>
                        <span className="text-xl font-semibold" style={{ color: colors.text }}>PocketWall</span>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>Create your account</p>
                    <p className="text-xs mt-1" style={{ color: '#86efac' }}>🎁 7-day free Pro trial included</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded text-sm flex items-start gap-2"
                            style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#fca5a5' }}>
                            <span>⚠</span><span>{error}</span>
                        </div>
                    )}

                    {/* Google */}
                    <button onClick={handleGoogleSignup} disabled={loading}
                        className="w-full py-2.5 rounded text-sm font-medium flex items-center justify-center gap-3 disabled:opacity-50 mb-4"
                        style={{ backgroundColor: '#ffffff', color: '#333333' }}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 4.66c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px" style={{ backgroundColor: colors.border }}></div>
                        <span className="text-xs" style={{ color: colors.textMuted }}>or</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: colors.border }}></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text }}
                                placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Password</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text }}
                                placeholder="At least 6 characters" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Confirm Password</label>
                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text }}
                                placeholder="Repeat password" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 rounded text-sm font-semibold disabled:opacity-50 mt-4"
                            style={{ backgroundColor: accentColor, color: 'white' }}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-xs text-center mt-4" style={{ color: colors.textMuted }}>
                        By signing up, you agree to our Terms and Privacy Policy
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 text-center text-sm"
                    style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.footerBg, color: colors.text }}>
                    <span style={{ color: colors.textMuted }}>Already have an account? </span>
                    <Link to="/login" className="font-medium hover:underline" style={{ color: accentColor }}>Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
