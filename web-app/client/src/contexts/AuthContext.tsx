
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface AuthContextType {
    user: any;
    token: string | null;
    socket: Socket | null;
    login: (token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default to a mock token to bypass login screen
    const [token, setToken] = useState<string | null>("mock-demo-token");
    const [user, setUser] = useState<any>({ name: "Demo User" });
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (token) {
            // Initialize Socket
            // Defaults to window.location if not specified, but for dev we point to 3000
            const newSocket = io("http://localhost:3000", {
                auth: { token }
            });
            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            setSocket(null);
        }
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // Decode token to get user info in real app
        setUser({ name: "Demo User" });
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, socket, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
