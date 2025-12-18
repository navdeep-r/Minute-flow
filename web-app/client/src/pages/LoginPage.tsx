
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();

    const handleLogin = () => {
        // Mock a token from "OAuth"
        login("mock-jwt-token-12345");
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-secondary/10" />

            <div className="z-10 bg-card border border-muted p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    MinuteFlow
                </h1>
                <p className="text-center text-muted-foreground mb-8">
                    AI-Powered Meeting Intelligence
                </p>

                <button
                    onClick={handleLogin}
                    className="w-full bg-foreground text-background font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                    Sign in with Organization
                    <ArrowRight size={18} />
                </button>

                <p className="mt-4 text-xs text-center text-muted-foreground">
                    By signing in, you agree to the Privacy Policy.
                </p>
            </div>
        </div>
    );
};
