import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const { login, loginWithGoogle, resendVerificationEmail, resetPassword } = useAuth();
    const navigate = useNavigate();

    const formRef = useRef(null);

    // Theme detection - uses saved preference or system preference
    const getTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    };

    const isDark = getTheme() === 'dark';

    // Theme colors
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

    // Load saved credentials
    useEffect(() => {
        const savedEmail = localStorage.getItem('pocketwall_saved_email');
        const savedPwd = localStorage.getItem('pocketwall_saved_pwd');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
        if (savedPwd) {
            try {
                setPassword(atob(savedPwd)); // Decode from base64
            } catch (e) { }
        }
    }, []);

    // Focus fix for Electron
    useEffect(() => {
        const handleFocus = () => {
            if (document.activeElement && document.activeElement.blur) {
                const active = document.activeElement;
                active.blur();
                setTimeout(() => active.focus(), 10);
            }
            if (formRef.current) {
                formRef.current.style.display = 'none';
                formRef.current.offsetHeight;
                formRef.current.style.display = '';
            }
        };
        if (window.api && window.api.onWindowFocus) {
            window.api.onWindowFocus(handleFocus);
        }
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            if (window.api && window.api.removeWindowFocusListener) {
                window.api.removeWindowFocusListener();
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setInfo('');
            setShowVerificationMessage(false);
            setLoading(true);

            if (rememberMe) {
                localStorage.setItem('pocketwall_saved_email', email);
                localStorage.setItem('pocketwall_saved_pwd', btoa(password)); // Encode to base64
            } else {
                localStorage.removeItem('pocketwall_saved_email');
                localStorage.removeItem('pocketwall_saved_pwd');
            }

            await login(email, password);
            navigate('/');
        } catch (err) {
            if (err.message === 'EMAIL_NOT_VERIFIED') {
                setShowVerificationMessage(true);
                setError('Please verify your email before logging in.');
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password. Please try again.');
            } else if (err.code === 'auth/user-not-found') {
                setError('No account found with this email. Please sign up first.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError('Failed to log in: ' + err.message);
            }
        }
        setLoading(false);
    };

    const handleResendVerification = async () => {
        try {
            setLoading(true);
            setError('');
            const sent = await resendVerificationEmail();
            if (sent) {
                setInfo('Verification email sent! Check your inbox.');
                setShowVerificationMessage(false);
            } else {
                setError('Could not send email. Try logging in again.');
            }
        } catch (err) {
            setError('Failed to send email: ' + err.message);
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email first.');
            return;
        }
        try {
            setLoading(true);
            await resetPassword(email);
            setInfo('Password reset email sent!');
            setError('');
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email.');
            } else {
                setError('Failed to send reset email.');
            }
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setInfo('');
            setLoading(true);
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            if (err.message === 'GOOGLE_AUTH_REDIRECT') {
                setInfo('Google Sign-In opened in browser.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign-in cancelled.');
            } else {
                setError('Google sign-in failed.');
            }
        }
        setLoading(false);

        // Force focus restoration after popup closes
        setTimeout(() => {
            document.body.style.display = 'none';
            document.body.offsetHeight;
            document.body.style.display = '';
            // Focus on email input
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) emailInput.focus();
        }, 100);
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: colors.bg, fontFamily: '"Segoe UI", system-ui, sans-serif' }}
        >
            <div
                className="w-full max-w-md rounded-lg shadow-2xl overflow-hidden"
                style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}` }}
            >
                {/* Header */}
                <div
                    className="px-6 py-4 text-center"
                    style={{ borderBottom: `1px solid ${colors.border}`, background: colors.headerBg }}
                >
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div
                            className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: accentColor }}
                        >P</div>
                        <span className="text-xl font-semibold" style={{ color: colors.text }}>PocketWall</span>
                    </div>
                    <p className="text-sm" style={{ color: colors.textMuted }}>Sign in to continue</p>
                </div>

                {/* Content */}
                <div className="p-6" ref={formRef}>
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded text-sm flex items-start gap-2"
                            style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#fca5a5' }}>
                            <span>⚠</span><span>{error}</span>
                        </div>
                    )}

                    {/* Verification */}
                    {showVerificationMessage && (
                        <div className="mb-4 p-4 rounded"
                            style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                            <p className="text-sm mb-3 flex items-center gap-2" style={{ color: '#93c5fd' }}>
                                <span>📧</span>Email verification required
                            </p>
                            <button onClick={handleResendVerification} disabled={loading}
                                className="w-full py-2 rounded text-sm font-medium disabled:opacity-50"
                                style={{ backgroundColor: accentColor, color: 'white' }}>
                                {loading ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                        </div>
                    )}

                    {/* Success */}
                    {info && (
                        <div className="mb-4 p-3 rounded text-sm flex items-start gap-2"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac' }}>
                            <span>✓</span><span>{info}</span>
                        </div>
                    )}

                    {/* Google */}
                    <button onClick={handleGoogleSignIn} disabled={loading}
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

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px" style={{ backgroundColor: colors.border }}></div>
                        <span className="text-xs" style={{ color: colors.textMuted }}>or</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: colors.border }}></div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-1"
                                style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text }}
                                placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Password</label>
                            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-1"
                                style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}`, color: colors.text }}
                                placeholder="Enter password" />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded" />
                                <span className="text-xs" style={{ color: colors.textMuted }}>Remember email</span>
                            </label>
                            <button type="button" onClick={handleForgotPassword} className="text-xs hover:underline" style={{ color: accentColor }}>
                                Forgot password?
                            </button>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 rounded text-sm font-semibold disabled:opacity-50"
                            style={{ backgroundColor: accentColor, color: 'white' }}>
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 text-center text-sm"
                    style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.footerBg, color: colors.text }}>
                    <span style={{ color: colors.textMuted }}>Don't have an account? </span>
                    <Link to="/signup" className="font-medium hover:underline" style={{ color: accentColor }}>Sign Up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
