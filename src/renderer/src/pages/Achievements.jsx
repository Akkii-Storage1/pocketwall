
import React, { useState, useEffect } from 'react';
import GamificationEngine from '../utils/GamificationEngine';
import { useToast } from '../components/Toast';

const LevelUpModal = ({ level, onClose, isDark }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full transform transition-all animate-bounce-in relative overflow-hidden">
                {/* Confetti-like decoration */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[20%] text-4xl animate-fall-slow">🎊</div>
                    <div className="absolute top-[-20%] left-[50%] text-4xl animate-fall-medium">✨</div>
                    <div className="absolute top-[-15%] left-[80%] text-4xl animate-fall-fast">🎉</div>
                </div>

                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    Level Up!
                </h2>
                <p className="text-lg mb-6 text-gray-600 dark:text-gray-300">
                    You are now a <br />
                    <span className="font-bold text-xl text-gray-800 dark:text-white">{level.name}</span>
                </p>
                <div className="text-4xl font-bold mb-8 text-yellow-500">
                    Lvl {level.level}
                </div>
                <button
                    onClick={onClose}
                    className="px-8 py-3 rounded-full font-bold text-white shadow-lg hover:transform hover:scale-105 transition-transform"
                    style={{ background: 'linear-gradient(90deg, #0078d4, #00bcf2)' }}
                >
                    Awesome!
                </button>
            </div>
        </div>
    );
};

const Achievements = ({ isDark }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const toast = useToast();

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const secondaryText = isDark ? '#a0a0a0' : '#666666';

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await GamificationEngine.calculateStats();
            setStats(data);

            // Check for Level Up
            const lastLevel = parseInt(localStorage.getItem('pocketwall_last_level') || '0');
            if (data.level.level > lastLevel && lastLevel !== 0) {
                setShowLevelUp(true);
                // Play sound effect (optional, browser policy might block)
                // const audio = new Audio('/levelup.mp3'); audio.play().catch(() => {});
            }

            // Update stored level
            if (data.level.level !== lastLevel) {
                localStorage.setItem('pocketwall_last_level', data.level.level.toString());
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (type, item) => {
        let text = '';
        if (type === 'level') {
            text = `🚀 I just reached Level ${item.level} (${item.name}) on PocketWall! My Financial Health is leveling up! 🏆 #PocketWall #FinanceGoals`;
        } else if (type === 'achievement') {
            text = `🔓 Unlocked: "${item.title}" on PocketWall! ${item.description} 🎯 #PocketWall #FinanceGoals`;
        }

        navigator.clipboard.writeText(text).then(() => {
            toast.success('Copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy');
        });
    };

    const getBadgeColor = (lvl) => {
        if (lvl >= 5) return 'linear-gradient(45deg, #FFD700, #FDB931)'; // Gold
        if (lvl >= 3) return 'linear-gradient(45deg, #E0E0E0, #BDBDBD)'; // Silver
        return 'linear-gradient(45deg, #CD7F32, #A0522D)'; // Bronze
    };

    if (loading || !stats) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div style={{ color: textColor }}>Loading Achievements...</div>
            </div>
        );
    }

    const { level, nextLevel, totalXp, achievements } = stats;
    const xpProgress = nextLevel
        ? ((totalXp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100
        : 100;

    return (
        <div className="h-full p-6 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            {showLevelUp && <LevelUpModal level={level} onClose={() => setShowLevelUp(false)} isDark={isDark} />}

            {/* Header / Level Card */}
            <div className="mb-8 p-6 rounded-xl shadow-lg relative overflow-hidden"
                style={{
                    background: isDark ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    border: `1px solid ${borderColor}`
                }}
            >
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    {/* Level Badge */}
                    <div className="relative group cursor-pointer" onClick={() => handleShare('level', level)}>
                        <div className="w-28 h-28 rounded-full flex items-center justify-center text-5xl shadow-2xl transform transition-transform group-hover:scale-110"
                            style={{
                                background: getBadgeColor(level.level),
                                border: '4px solid rgba(255,255,255,0.3)',
                                boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
                            }}
                        >
                            {Math.floor(level.level)}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Click to Share
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-bold mb-1" style={{ color: textColor }}>{level.name}</h2>
                                <div className="text-sm mb-3 opacity-80" style={{ color: secondaryText }}>
                                    Total XP: <span className="font-mono font-bold text-blue-500">{totalXp.toLocaleString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleShare('level', level)}
                                className="hidden md:block px-3 py-1 text-xs border rounded hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                                style={{ borderColor, color: textColor }}
                            >
                                🔗 Share Status
                            </button>
                        </div>

                        {/* XP Bar */}
                        <div className="w-full h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative shadow-inner">
                            <div
                                className="h-full transition-all duration-1000 ease-out relative"
                                style={{
                                    width: `${xpProgress}%`,
                                    background: 'linear-gradient(90deg, #0078d4, #00bcf2)'
                                }}
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 animate-pulse"></div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                {Math.floor(xpProgress)}% to Level {level.level + 1}
                            </div>
                        </div>

                        <div className="flex justify-between text-xs mt-2 font-medium" style={{ color: secondaryText }}>
                            <span>Level {level.level}</span>
                            <span>{nextLevel ? `${Math.floor(nextLevel.minXp - totalXp)} XP needed` : 'Max Level Reached!'}</span>
                        </div>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 opacity-5 text-9xl transform translate-x-10 -translate-y-10 pointer-events-none select-none" style={{ color: textColor }}>
                    🏆
                </div>
            </div>

            {/* Achievements Grid */}
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-xl font-bold" style={{ color: textColor }}>Badges & Milestones</h3>
                <span className="text-xs" style={{ color: secondaryText }}>
                    {achievements.filter(a => a.status.unlocked).length} / {achievements.length} Unlocked
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {achievements.map((ach) => (
                    <div
                        key={ach.id}
                        className={`p-4 rounded-lg border transition-all duration-300 relative group ${ach.status.unlocked ? 'shadow-md transform hover:-translate-y-1 hover:shadow-lg' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-80'}`}
                        style={{
                            backgroundColor: panelBg,
                            borderColor: ach.status.unlocked ? '#ffd700' : borderColor,
                            borderWidth: ach.status.unlocked ? '2px' : '1px'
                        }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="text-4xl transform group-hover:scale-110 transition-transform">{ach.icon}</div>
                            {ach.status.unlocked && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleShare('achievement', ach); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                >
                                    Share
                                </button>
                            )}
                        </div>

                        <h4 className="font-bold text-sm mb-1" style={{ color: textColor }}>{ach.title}</h4>
                        <p className="text-xs mb-3 h-8 leading-tight" style={{ color: secondaryText }}>{ach.description}</p>

                        <div className="mt-auto">
                            <div className="flex justify-between text-[10px] mb-1" style={{ color: secondaryText }}>
                                <span>{ach.status.unlocked ? 'Completed' : 'Progress'}</span>
                                <span>{Math.round(ach.status.progress)}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${ach.status.unlocked ? 'bg-green-500' : 'bg-blue-400'}`}
                                    style={{ width: `${ach.status.progress}%` }}
                                />
                            </div>
                            <div className="text-right text-[10px] mt-1 font-mono font-bold" style={{ color: ach.status.unlocked ? '#107c10' : secondaryText }}>
                                +{ach.xp} XP
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Achievements;
