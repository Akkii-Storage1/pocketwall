import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { FeatureProvider } from './context/FeatureContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ToastProvider>
            <FeatureProvider>
                <HashRouter>
                    <App />
                </HashRouter>
            </FeatureProvider>
        </ToastProvider>
    </React.StrictMode>,
);
