import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Admin emails - add your email here (lowercase)
const ADMIN_EMAILS = [
    'pocketwall01@gmail.com',
    'akkiistorage1@gmail.com',
];

const Admin = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Check admin access (case-insensitive)
    const userEmail = currentUser?.email?.toLowerCase() || '';
    const isAdmin = currentUser && ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);

    // Debug log - check in browser console (F12)
    console.log('Admin Debug:', {
        currentUser: currentUser?.email,
        userEmail,
        isAdmin,
        ADMIN_EMAILS
    });

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchUsers();
    }, [currentUser, isAdmin]);

    const fetchUsers = async () => {
        try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersList = usersSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
        setLoading(false);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const now = new Date();
        const trialEnds = user.trialEnds ? new Date(user.trialEnds) : null;
        const isTrialActive = trialEnds && trialEnds > now && user.plan !== 'pro';

        if (filterPlan === 'all') return matchesSearch;
        if (filterPlan === 'pro') return matchesSearch && user.plan === 'pro';
        if (filterPlan === 'free') return matchesSearch && user.plan !== 'pro' && !isTrialActive;
        if (filterPlan === 'trial') return matchesSearch && isTrialActive;
        return matchesSearch;
    });

    const analytics = {
        total: users.length,
        pro: users.filter(u => u.plan === 'pro').length,
        trial: users.filter(u => {
            const trialEnds = u.trialEnds ? new Date(u.trialEnds) : null;
            return trialEnds && trialEnds > new Date() && u.plan !== 'pro';
        }).length,
        expired: users.filter(u => {
            const trialEnds = u.trialEnds ? new Date(u.trialEnds) : null;
            return trialEnds && trialEnds <= new Date() && u.plan !== 'pro';
        }).length
    };

    const upgradeToPro = async (userId) => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'users', userId), { plan: 'pro' });
            await fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setActionLoading(false);
    };

    const downgradeToFree = async (userId) => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'users', userId), { plan: 'free' });
            await fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setActionLoading(false);
    };

    const extendTrial = async (userId, days = 7) => {
        setActionLoading(true);
        try {
            const user = users.find(u => u.id === userId);
            const currentEnd = user.trialEnds ? new Date(user.trialEnds) : new Date();
            const newEnd = new Date(Math.max(currentEnd, new Date()));
            newEnd.setDate(newEnd.getDate() + days);
            await updateDoc(doc(db, 'users', userId), { trialEnds: newEnd.toISOString() });
            await fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setActionLoading(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const getTrialStatus = (user) => {
        if (user.plan === 'pro') return { text: 'Pro', color: 'bg-green-500' };
        const trialEnds = user.trialEnds ? new Date(user.trialEnds) : null;
        if (!trialEnds) return { text: 'Free', color: 'bg-gray-500' };
        const now = new Date();
        const daysLeft = Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0) return { text: `Trial (${daysLeft}d)`, color: 'bg-blue-500' };
        return { text: 'Expired', color: 'bg-red-500' };
    };

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">Manage users and view analytics</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl font-bold text-blue-400">{analytics.total}</div>
                        <div className="text-gray-400 text-sm">Total Users</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl font-bold text-green-400">{analytics.pro}</div>
                        <div className="text-gray-400 text-sm">Pro Users</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl font-bold text-yellow-400">{analytics.trial}</div>
                        <div className="text-gray-400 text-sm">Active Trials</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl font-bold text-red-400">{analytics.expired}</div>
                        <div className="text-gray-400 text-sm">Expired Trials</div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none"
                    >
                        <option value="all">All Users</option>
                        <option value="pro">Pro Only</option>
                        <option value="trial">Active Trial</option>
                        <option value="free">Free/Expired</option>
                    </select>
                    <button onClick={fetchUsers} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                        Refresh
                    </button>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading users...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Trial Ends</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {filteredUsers.map(user => {
                                    const status = getTrialStatus(user);
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-700/50">
                                            <td className="px-4 py-3 text-sm">{user.email || user.id}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.trialEnds)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => setSelectedUser(user)} className="text-blue-400 hover:text-blue-300 text-sm">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {!loading && filteredUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-400">No users found</div>
                    )}
                </div>

                {selectedUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full p-6">
                            <h3 className="text-xl font-bold mb-4">Manage User</h3>
                            <div className="space-y-3 mb-6">
                                <div>
                                    <span className="text-gray-400 text-sm">Email:</span>
                                    <div className="font-medium">{selectedUser.email}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm">Current Plan:</span>
                                    <div className="font-medium capitalize">{selectedUser.plan || 'free'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm">Trial Ends:</span>
                                    <div className="font-medium">{formatDate(selectedUser.trialEnds)}</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {selectedUser.plan !== 'pro' && (
                                    <button onClick={() => upgradeToPro(selectedUser.id)} disabled={actionLoading}
                                        className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                                        {actionLoading ? 'Processing...' : '⬆️ Upgrade to Pro'}
                                    </button>
                                )}
                                {selectedUser.plan === 'pro' && (
                                    <button onClick={() => downgradeToFree(selectedUser.id)} disabled={actionLoading}
                                        className="w-full py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                                        {actionLoading ? 'Processing...' : '⬇️ Downgrade to Free'}
                                    </button>
                                )}
                                <button onClick={() => extendTrial(selectedUser.id, 7)} disabled={actionLoading}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                                    {actionLoading ? 'Processing...' : '📅 Extend Trial (+7 days)'}
                                </button>
                                <button onClick={() => extendTrial(selectedUser.id, 30)} disabled={actionLoading}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50">
                                    {actionLoading ? 'Processing...' : '📅 Extend Trial (+30 days)'}
                                </button>
                            </div>
                            <button onClick={() => setSelectedUser(null)}
                                className="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
