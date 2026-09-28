import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const Z_INDEX_LAYERS = {
    BASE: 0,
    CONTENT: 1,
    STICKY_HEADER: 1000,
    STICKY_FOOTER: 1000,
    DRAWER: 2000,
    AUTH_VIEW: 3000,
    BACKDROP_BASE: 10000,
    MODAL_CONTENT_BASE: 10001,
    TOAST_NOTIFICATIONS: 30000,
    GLOBAL_TOOLTIP: 9999999,
};

export interface ModalZIndexInfo {
    backdropZIndex: number;
    contentZIndex: number;
    stackOrder: number;
    isTopModal: boolean;
}

export interface ModalContextType {
    activeModals: string[];
    registerModal: (id: string) => number;
    unregisterModal: (id: string) => void;
    getZIndex: (id: string, baseLayer?: number) => ModalZIndexInfo;
    activeModalCount: number;
    topModalId: string | null;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeModals, setActiveModals] = useState<string[]>([]);

    const registerModal = useCallback((id: string) => {
        let order = 0;
        setActiveModals(prev => {
            if (prev.includes(id)) {
                order = prev.indexOf(id);
                return prev;
            }
            const next = [...prev, id];
            order = next.length - 1;
            return next;
        });
        return order;
    }, []);

    const unregisterModal = useCallback((id: string) => {
        setActiveModals(prev => prev.filter(m => m !== id));
    }, []);

    const getZIndex = useCallback((id: string, baseLayer = Z_INDEX_LAYERS.BACKDROP_BASE): ModalZIndexInfo => {
        const index = activeModals.indexOf(id);
        const stackOrder = index >= 0 ? index : Math.max(0, activeModals.length);
        const backdropZIndex = baseLayer + (stackOrder * 100);
        const contentZIndex = backdropZIndex + 1;
        const isTopModal = activeModals.length > 0 && activeModals[activeModals.length - 1] === id;

        return {
            backdropZIndex,
            contentZIndex,
            stackOrder,
            isTopModal: index >= 0 ? isTopModal : true
        };
    }, [activeModals]);

    // Handle body scroll locking when modals are active
    useEffect(() => {
        if (activeModals.length > 0) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow || 'auto';
            };
        }
    }, [activeModals.length]);

    const contextValue: ModalContextType = {
        activeModals,
        registerModal,
        unregisterModal,
        getZIndex,
        activeModalCount: activeModals.length,
        topModalId: activeModals.length > 0 ? activeModals[activeModals.length - 1] : null,
    };

    return (
        <ModalContext.Provider value={contextValue}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModalContext = (): ModalContextType => {
    const context = useContext(ModalContext);
    if (!context) {
        // Fallback for components rendered outside ModalProvider
        return {
            activeModals: [],
            registerModal: () => 0,
            unregisterModal: () => {},
            getZIndex: (_id: string, baseLayer = Z_INDEX_LAYERS.BACKDROP_BASE) => ({
                backdropZIndex: baseLayer,
                contentZIndex: baseLayer + 1,
                stackOrder: 0,
                isTopModal: true
            }),
            activeModalCount: 0,
            topModalId: null
        };
    }
    return context;
};
