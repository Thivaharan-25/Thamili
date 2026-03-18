import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

/**
 * LoadingContext - Global Loading State Management
 * Manages the Anti-Gravity Loading Spinner display state
 */

interface LoadingContextType {
    isLoading: boolean;
    showLoading: () => void;
    hideLoading: () => void;
    setLoading: (loading: boolean) => void;
}

export type { LoadingContextType };

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
    children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);

    const showLoading = useCallback(() => {
        console.log('🔄 [LoadingContext] showLoading called');
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        console.log('✅ [LoadingContext] hideLoading called');
        setIsLoading(false);
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        setIsLoading(loading);
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading, setLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

/**
 * Hook to use the loading context
 * @throws Error if used outside LoadingProvider
 */
export const useLoading = (): LoadingContextType => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
