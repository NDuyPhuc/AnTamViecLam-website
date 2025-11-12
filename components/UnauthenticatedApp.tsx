import React, { useState } from 'react';
import LandingPage from './LandingPage';
import AuthPage from './auth/AuthPage';

const UnauthenticatedApp: React.FC = () => {
    const [view, setView] = useState<'landing' | 'auth'>('landing');

    if (view === 'landing') {
        return <LandingPage onNavigateToAuth={() => setView('auth')} />;
    }

    return <AuthPage onBackToLanding={() => setView('landing')} />;
};

export default UnauthenticatedApp;