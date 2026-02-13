import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DASHBOARD_PAGES, DashboardPageKey } from '../pages/DashboardConfig';

export function useDashboardNavigation(initialPage: DashboardPageKey = 'dashboard') {
    const [searchParams] = useSearchParams();

    // Determinar página inicial: Prioridade para URL (?page=...), depois initialPage
    const getInitialPage = (): DashboardPageKey => {
        const pageParam = searchParams.get('page') as DashboardPageKey;
        if (pageParam && DASHBOARD_PAGES[pageParam]) {
            return pageParam;
        }
        return initialPage;
    };

    const [currentPage, setCurrentPage] = useState<DashboardPageKey>(getInitialPage);

    // Opcional: Sincronizar se a URL mudar externamente (navegação browser)
    useEffect(() => {
        const pageParam = searchParams.get('page') as DashboardPageKey;
        if (pageParam && DASHBOARD_PAGES[pageParam] && pageParam !== currentPage) {
            setCurrentPage(pageParam);
        }
    }, [searchParams]);

    useEffect(() => {
        const handleCustomNavigation = (event: CustomEvent) => {
            const pageKey = event.detail as DashboardPageKey;

            if (DASHBOARD_PAGES[pageKey]) {
                setCurrentPage(pageKey);
                // Opcional: Atualizar URL silenciosamente para refletir estado?
                // window.history.pushState({}, '', `/dashboard?page=${pageKey}`);
            } else {
                console.warn(`[useDashboardNavigation] Página não encontrada: ${pageKey}`);
                setCurrentPage('dashboard');
            }
        };

        window.addEventListener('navigate-to-page' as any, handleCustomNavigation);

        return () => {
            window.removeEventListener('navigate-to-page' as any, handleCustomNavigation);
        };
    }, []);

    const Component = DASHBOARD_PAGES[currentPage] || DASHBOARD_PAGES['dashboard'];

    return {
        currentPage,
        Component
    };
}
