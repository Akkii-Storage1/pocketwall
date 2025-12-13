import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userPlan, setUserPlan] = useState('free');
    const [emailVerified, setEmailVerified] = useState(false);

    // Signup with Email Verification
    const signup = async (email, password) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Send verification email
        await sendEmailVerification(result.user);

        // Create user document
        await setDoc(doc(db, 'users', result.user.uid), {
            email: email,
            plan: 'free',
            createdAt: new Date().toISOString(),
            trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            emailVerified: false
        });

        // Sign out after signup (user needs to verify first)
        await signOut(auth);

        return result;
    };

    // Login with email verification check
    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);

        // Check if email is verified
        if (!result.user.emailVerified) {
            // Keep user signed in temporarily so we can resend verification
            // The UI will handle showing the resend option
            throw new Error('EMAIL_NOT_VERIFIED');
        }

        return result;
    };

    // Send verification email to currently signed-in unverified user
    const resendVerificationEmail = async () => {
        if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
            // Sign out after sending
            await signOut(auth);
            return true;
        }
        return false;
    };

    // Password Reset
    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    // Google Sign-In
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            const result = await signInWithPopup(auth, provider);

            // Check if user doc exists, if not create it
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', result.user.uid), {
                    email: result.user.email,
                    plan: 'free',
                    createdAt: new Date().toISOString(),
                    trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    emailVerified: true,
                    authProvider: 'google'
                });
            }
            return result;
        } catch (error) {
            // If popup fails (Electron), open in external browser
            if (error.code === 'auth/popup-blocked' ||
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/cancelled-popup-request') {

                const loginUrl = 'https://pocketwall.web.app/login?from=desktop';
                if (window.electron && window.electron.shell) {
                    window.electron.shell.openExternal(loginUrl);
                } else {
                    window.open(loginUrl, '_blank');
                }
                throw new Error('GOOGLE_AUTH_REDIRECT');
            }
            throw error;
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    // Refresh email verification status
    const refreshEmailVerification = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            setEmailVerified(auth.currentUser.emailVerified);

            if (auth.currentUser.emailVerified) {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    emailVerified: true
                }, { merge: true });
            }

            return auth.currentUser.emailVerified;
        }
        return false;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Only set user if email is verified (or Google user)
            if (user && user.emailVerified) {
                setCurrentUser(user);
                setEmailVerified(true);

                // Fetch Plan details
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const isPro = data.plan === 'pro';
                        const isTrialActive = new Date(data.trialEnds) > new Date();
                        setUserPlan(isPro || isTrialActive ? 'pro' : 'free');
                    }
                } catch (error) {
                    console.error("Error fetching user plan:", error);
                }

                // Cloud Sync: Pull data from cloud on login
                try {
                    const DataAdapter = (await import('../utils/dataAdapter')).default;
                    const syncResult = await DataAdapter.syncFromCloud();
                    console.log('Cloud sync on login:', syncResult);
                } catch (error) {
                    console.warn('Cloud sync on login failed:', error);
                }
            } else {
                setCurrentUser(null);
                setUserPlan('free');
                setEmailVerified(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userPlan,
        emailVerified,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        refreshEmailVerification
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
