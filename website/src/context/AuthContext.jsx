import { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userPlan, setUserPlan] = useState('free');
    const [trialDaysLeft, setTrialDaysLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [emailVerified, setEmailVerified] = useState(false);

    // Sign up with Email & Password + Verification
    const signup = async (email, password) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Send verification email
        await sendEmailVerification(result.user);

        // Create user document with 7-day trial
        await setDoc(doc(db, 'users', result.user.uid), {
            email: email,
            plan: 'free',
            createdAt: new Date().toISOString(),
            trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            emailVerified: false
        });
        return result;
    };

    // Login with Email & Password - Check verification
    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);

        // Check if email is verified
        if (!result.user.emailVerified) {
            await signOut(auth);
            throw new Error('EMAIL_NOT_VERIFIED');
        }

        return result;
    };

    // Resend verification email
    const resendVerificationEmail = async () => {
        if (auth.currentUser && !auth.currentUser.emailVerified) {
            await sendEmailVerification(auth.currentUser);
            return true;
        }
        return false;
    };

    // Login with Google (no verification needed - Google accounts are verified)
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

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
    };

    // Logout
    const logout = () => {
        return signOut(auth);
    };

    // Reset Password
    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
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

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            setEmailVerified(user?.emailVerified || false);

            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const isPro = data.plan === 'pro';
                        const trialEnd = new Date(data.trialEnds);
                        const now = new Date();
                        const isTrialActive = trialEnd > now;

                        // Calculate days left
                        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
                        setTrialDaysLeft(daysLeft);

                        setUserPlan(isPro ? 'pro' : (isTrialActive ? 'trial' : 'free'));
                    }
                } catch (error) {
                    console.error("Error fetching user plan:", error);
                }
            } else {
                setUserPlan('free');
                setTrialDaysLeft(0);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userPlan,
        trialDaysLeft,
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
