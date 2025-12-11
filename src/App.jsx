import React from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]" />
                </div>

                {/* Page Content */}
                <div className="relative z-10 h-full">
                    <Dashboard />
                </div>
            </main>
        </div>
    );
}

export default App;
