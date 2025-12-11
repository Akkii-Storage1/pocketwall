import React, { useEffect, useState } from 'react';
import { useFeature } from '../context/FeatureContext';

const Celebration = () => {
    const { showCelebration, dismissCelebration, tier, config } = useFeature();
    const [confetti, setConfetti] = useState([]);

    useEffect(() => {
        if (showCelebration) {
            // Generate confetti pieces
            const pieces = [];
            const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

            for (let i = 0; i < 100; i++) {
                pieces.push({
                    id: i,
                    left: Math.random() * 100,
                    delay: Math.random() * 2,
                    duration: 2 + Math.random() * 3,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 8 + Math.random() * 8,
                    rotation: Math.random() * 360
                });
            }
            setConfetti(pieces);

            // Play sound effect if available
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+UhXNmYnh+hYqHfGxdUFFhaHN2bmJUTEpSW2VqZ1xMQDk7RU9VVEw/NDEyO0RIVEU7MCooLTY/REM8MicgHyQrMzg2MSwkHx0hJy0xMC0pIx0aGh4jKCsqJyMfGxgXGR0iJSclIh4aFxYXGhwfISAeGxkXFhYZGx0fHx0bGRcWFhgaHB4eHRsZFxcXGBobHR0cGxkXFxcYGhscHBsaGRcXFxgZGxwbGxoZFxcXGBkaGxsaGRgXFxcYGRobGhoZGBcXFxgZGhsaGhkYFxcXGBkaGhoZGRgXFxcYGRoaGhkZGBcXFxgZGhoaGRkYFxcXGBkaGhoZGRgXFxcYGRoaGhkZGBcXFw==');
                audio.volume = 0.3;
                audio.play().catch(() => { }); // Ignore errors
            } catch (e) { }
        } else {
            setConfetti([]);
        }
    }, [showCelebration]);

    if (!showCelebration) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            {/* Confetti */}
            {confetti.map(piece => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti"
                    style={{
                        left: `${piece.left}%`,
                        top: '-20px',
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                        animationDelay: `${piece.delay}s`,
                        animationDuration: `${piece.duration}s`,
                        transform: `rotate(${piece.rotation}deg)`
                    }}
                />
            ))}

            {/* Celebration Message */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div
                    className="bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500 text-white px-12 py-8 rounded-3xl shadow-2xl text-center animate-bounce-in"
                    style={{
                        animation: 'bounceIn 0.5s ease-out'
                    }}
                >
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
                    <p className="text-xl mb-4">Welcome to {config?.label || 'Pro Plan'}!</p>
                    <p className="text-sm opacity-80 mb-6">All premium features are now unlocked</p>
                    <button
                        onClick={dismissCelebration}
                        className="px-8 py-3 bg-white text-violet-600 font-bold rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105"
                    >
                        Let's Go! 🚀
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-20px) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                @keyframes bounceIn {
                    0% {
                        transform: scale(0.3);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.05);
                    }
                    70% {
                        transform: scale(0.9);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-confetti {
                    animation: confetti-fall linear forwards;
                }
            `}</style>
        </div>
    );
};

export default Celebration;
