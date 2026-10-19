import React, { useState, useCallback, useContext } from 'react';
import { ToastContextType } from './config';

export const ToastContext = React.createContext<ToastContextType | null>(null);

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<any[]>([]);
    const toastCounter = React.useRef(0);

    const addToast = useCallback((message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success') => {
        toastCounter.current += 1;
        const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${toastCounter.current}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const contextValue = React.useMemo(() => ({ addToast }), [addToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{zIndex: 30000}}>
                {toasts.map((toast, idx) => (
                    <div key={`${toast.id || 'toast'}-${idx}`} className={`toast show bg-${toast.type} text-white`} role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="toast-body">{toast.message}</div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};