// Dashboard.tsx — DEBUG INSTRUMENTED
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { USE_MOCK_DATA } from '@/App';
import { Settings, LogOut, Plus, Menu, X, Home, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';
import CreatePortfolioDialog from '@/components/CreatePortfolioDialog';
import CashDialog from '@/components/CashDialog';
import { KpiCard } from '@/components/KpiCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { AllocationDonut } from '@/components/AllocationDonut';
import { HoldingsTable } from '@/components/HoldingsTable';
import { MobileHoldingsView } from '@/components/MobileHoldingsView';
import { OrderForm } from '@/components/OrderForm';
import { OrdersTable } from '@/components/OrdersTable';
import { MobileOrdersView } from '@/components/MobileOrdersView';
import { DeletePortfolioDialog } from '@/components/DeletePortfolioDialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { mockPortfolios, mockPositions, generatePerformanceData, mockOrders } from '@/lib/mock-data';
import type { Portfolio } from '@/lib/api';
import { api } from '@/lib/api';
import { transformPositions, transformOrders, transformMarketQuotes, transformPerformanceData } from '@/lib/api-adapters';
import { calculatePortfolioMetrics } from '@/lib/portfolio-utils';

type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'ALL';

// ---------- DEBUG HELPERS ----------
const DBG = true;
const ts = () => new Date().toISOString().slice(11, 23);
const dlog = (...args: any[]) => DBG && console.log(`[${ts()}][Dashboard]`, ...args);
const dwarn = (...args: any[]) => DBG && console.warn(`[${ts()}][Dashboard]`, ...args);
const derr = (...args: any[]) => DBG && console.error(`[${ts()}][Dashboard]`, ...args);

const getPeriodStartDate = (period: Period): Date => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  switch (period) {
    case '1D': return startOfDay;
    case '1W': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1M': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'YTD': return new Date(now.getFullYear(), 0, 1);
    case '1Y': return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'ALL': return new Date(0);
    default: return startOfDay;
  }
};

const getPeriodLabel = (period: Period): string => {
  switch (period) {
    case '1D': return 'Day';
    case '1W': return 'Week';
    case '1M': return 'Month';
    case 'YTD': return 'YTD';
    case '1Y': return 'Year';
    case 'ALL': return 'All-Time';
    default: return 'Period';
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const renderRef = useRef(0);
  renderRef.current += 1;
  dlog(`Render #${renderRef.current}`);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(!USE_MOCK_DATA);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1M');
  const [performanceViewMode, setPerformanceViewMode] = useState<'value' | 'percentage'>('value');
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState<Portfolio | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const logState = useCallback((label: string) => {
    dlog(label, {
      authLoading,
      userId: user?.id ?? null,
      selectedPortfolioId,
      selectedPeriod,
      performanceViewMode,
    });
  }, [authLoading, user?.id, selectedPortfolioId, selectedPeriod, performanceViewMode]);

  // Global error / rejection traps
  useEffect(() => {
    const onErr = (e: ErrorEvent) => derr('window error:', e.message, e.error);
    const onRej = (e: PromiseRejectionEvent) => derr('unhandledrejection:', e.reason);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    dlog('Mounted. (global error handlers attached)');
    logState('Initial state');
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
      dlog('Unmounted.');
    };
  }, [logState]);

  // React Query cache events
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      dlog('RQ cache event:', event?.type, (event as any)?.query?.queryKey);
    });
    return unsub;
  }, [queryClient]);

  // --- Auth handling (skip in mock mode) ---
  useEffect(() => {
    if (USE_MOCK_DATA) {
      dlog('MOCK: setting fake user');
      setUser({ email: 'dev@example.com' } as User);
      setAuthLoading(false);
      return;
    }

    let initialChecked = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      dlog('getSession resolved:', !!session, session?.user?.id);
      if (!session) {
        dlog('No session: navigate(/auth)');
        navigate('/auth');
      } else {
        setUser(session.user);
      }
      setAuthLoading(false);
      initialChecked = true;
      logState('After getSession');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      dlog('onAuthStateChange:', event, 'session?', !!session, session?.user?.id);
      if (!initialChecked) return; // ignore initial null snapshot
      if (event === 'SIGNED_OUT') {
        dlog('SIGNED_OUT: navigate(/auth)');
        navigate('/auth');
        return;
      }
      if (session) {
        dlog('Session present, setting user');
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- Portfolios list ---
  const { data: portfolios = [], isLoading: portfoliosLoading, isFetching: portfoliosFetching, status: portfoliosStatus, error: portfoliosError } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      dlog('portfolios queryFn firing…');
      if (USE_MOCK_DATA) {
        dlog('MOCK: returning mockPortfolios');
        return mockPortfolios;
      }
      const res = await api.portfolios.list();
      dlog('api.portfolios.list() returned:', res?.length);
      return res;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    dlog('portfolios query state:', { portfoliosStatus, portfoliosLoading, portfoliosFetching, error: !!portfoliosError });
  }, [portfoliosStatus, portfoliosLoading, portfoliosFetching, portfoliosError]);

  useEffect(() => {
    dlog('portfolios changed:', portfolios.length, portfolios.map(p => p.id));
  }, [portfolios]);

  // Initialize selection from localStorage or first portfolio ONCE after portfolios arrive
  useEffect(() => {
    if (!portfolios.length || selectedPortfolioId) return;
    const key = `oscillo:lastPortfolio:${user?.id ?? 'anon'}`;
    const saved = localStorage.getItem(key);
    const found = saved ? portfolios.find(p => p.id === saved) : null;
    const toSet = found?.id ?? portfolios[0].id;
    dlog('Init selection:', { saved, resolved: toSet });
    setSelectedPortfolioId(toSet);
  }, [portfolios, selectedPortfolioId, user?.id]);

  // Keep selection in localStorage
  useEffect(() => {
    if (!selectedPortfolioId) return;
    const key = `oscillo:lastPortfolio:${user?.id ?? 'anon'}`;
    localStorage.setItem(key, selectedPortfolioId);
    dlog('Persisted selectedPortfolioId to localStorage:', selectedPortfolioId);
  }, [selectedPortfolioId, user?.id]);

  // Derive the selected portfolio object safely on refetch
  const selectedPortfolio = useMemo(
    () => {
      const found = portfolios.find(p => p.id === selectedPortfolioId) ?? null;
      dlog('selectedPortfolio derive:', { selectedPortfolioId, found: found?.id });
      return found;
    },
    [portfolios, selectedPortfolioId]
  );

  // If selected ID vanishes (deleted elsewhere), fallback
  useEffect(() => {
    if (!selectedPortfolio && portfolios.length && !selectedPortfolioId) {
      dlog('Selected vanished, falling back to first:', portfolios[0].id);
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [selectedPortfolio, portfolios, selectedPortfolioId]);

  // --- Dependent queries ---
  const { data: positions = [], isLoading: positionsLoading, isFetching: positionsFetching, status: positionsStatus, error: positionsError } = useQuery({
    queryKey: ['positions', selectedPortfolioId],
    queryFn: async () => {
      dlog('positions queryFn firing with portfolioId:', selectedPortfolioId);
      if (!selectedPortfolioId) return [];
      if (USE_MOCK_DATA) return mockPositions;

      // 1) Fetch raw positions
      const response = await api.positions.list(selectedPortfolioId);
      dlog('[positions raw]', response);

      // 2) Collect tickers (support map or array; exclude cash)
      const rawPositions: any[] = Array.isArray((response as any)?.positions)
        ? (response as any).positions
        : Object.values((response as any)?.positions ?? {});
      const tickers = [...new Set(rawPositions
        .map((p: any) => p?.ticker)
        .filter((t: any) => t && t !== 'CA$H'))] as string[];
      dlog('[positions tickers]', tickers);

      // 3) Fetch market quotes if we have tickers
      let quotesByTicker: Record<string, any> = {};
      if (tickers.length > 0) {
        const rawQuotes = await api.market.quotes(tickers);
        quotesByTicker = transformMarketQuotes(rawQuotes);
        dlog('[quotes normalized]', Object.keys(quotesByTicker));
      }

      // 4) Let the adapter compute price, MV, PnL, etc.
      const transformed = transformPositions({
        ...(response as any),
        quotes: quotesByTicker,
        market_quotes: quotesByTicker, // adapter checks either key
      });

      const sample = transformed.slice(0, 5).map((p: any) => ({
        ticker: p.ticker,
        qty: p.quantity,
        avgCost: p.avg_cost,
        price: p.current_price,
        mv: p.market_value,
        cb: p.cost_basis,
        'pnl$': p.pnl,
        'pnl%': p.pnl_percentage,
        'day%': p.day_change_percentage,
        'alloc%': p.weight,
      }));
      dlog('[positions transformed sample]', sample);

      // flag any non-finite numbers
      const issues = transformed.filter((p: any) =>
        [p.quantity, p.avg_cost, p.current_price, p.market_value, p.cost_basis, p.pnl, p.pnl_percentage, p.weight]
          .some((v) => typeof v !== 'number' || !Number.isFinite(v))
      );
      if (issues.length) dlog('[positions transformed issues]', issues.slice(0, 3));



      return transformed;
    },
    enabled: !!selectedPortfolioId,
  });
  useEffect(() => {
    dlog('positions query state:', { positionsStatus, positionsLoading, positionsFetching, error: !!positionsError, len: positions.length });
  }, [positionsStatus, positionsLoading, positionsFetching, positionsError, positions]);

  const { data: performanceData = [], isLoading: perfLoading, isFetching: perfFetching, status: perfStatus, error: perfError } = useQuery({
    queryKey: ['performance', selectedPortfolioId, selectedPeriod],
    queryFn: async () => {
      dlog('performance queryFn:', { selectedPortfolioId, selectedPeriod });
      if (!selectedPortfolioId) return [];
      if (USE_MOCK_DATA) return generatePerformanceData(selectedPeriod);
      const response = await api.performance.get(selectedPortfolioId, selectedPeriod);
      return transformPerformanceData(response);
    },
    enabled: !!selectedPortfolioId,
  });
  useEffect(() => {
    dlog('performance query state:', { perfStatus, perfLoading, perfFetching, error: !!perfError, len: performanceData.length });
  }, [perfStatus, perfLoading, perfFetching, perfError, performanceData]);

  const { data: orders = [], isLoading: ordersLoading, isFetching: ordersFetching, status: ordersStatus, error: ordersError } = useQuery({
    queryKey: ['orders', selectedPortfolioId, selectedPeriod],
    queryFn: async () => {
      dlog('orders queryFn:', { selectedPortfolioId, selectedPeriod });
      if (!selectedPortfolioId) return [];
      if (USE_MOCK_DATA) {
        const periodStart = getPeriodStartDate(selectedPeriod);
        return mockOrders.filter(o => o.portfolio_id === selectedPortfolioId && new Date(o.timestamp) >= periodStart);
      }
      const response = await api.orders.list(selectedPortfolioId);
      const transformed = transformOrders(response);
      const periodStart = getPeriodStartDate(selectedPeriod);
      return transformed.filter(o => new Date(o.timestamp) >= periodStart);
    },
    enabled: !!selectedPortfolioId,
  });
  useEffect(() => {
    dlog('orders query state:', { ordersStatus, ordersLoading, ordersFetching, error: !!ordersError, len: orders.length });
  }, [ordersStatus, ordersLoading, ordersFetching, ordersError, orders]);

  const handleOrderSubmit = async (order: any) => {
    dlog('handleOrderSubmit:', order);
    if (!selectedPortfolioId) return;
    try {
      if (USE_MOCK_DATA) {
        toast({ title: 'Order placed', description: `${order.orderType} ${order.quantity} ${order.ticker}` });
      } else {
        const quantity = order.orderType === 'SELL' ? -order.quantity : order.quantity;
        await api.orders.create(selectedPortfolioId, { ticker: order.ticker, quantity, price: order.price });
        dlog('Order created. Invalidate queries.');
        queryClient.invalidateQueries({ queryKey: ['orders', selectedPortfolioId] });
        queryClient.invalidateQueries({ queryKey: ['positions', selectedPortfolioId] });
        toast({ title: 'Order placed', description: `Executed` });
      }
      setShowOrderPanel(false);
    } catch (e) {
      derr('Order submit failed:', e);
      toast({ title: 'Error', description: 'Failed to place order. Please try again.', variant: 'destructive' });
    }
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    dlog('handleDeletePortfolio prompt:', portfolio.id);
    setPortfolioToDelete(portfolio);
    setShowDeleteDialog(true);
  };

  const confirmDeletePortfolio = async () => {
    dlog('confirmDeletePortfolio for:', portfolioToDelete?.id);
    if (!portfolioToDelete) return;
    try {
      if (USE_MOCK_DATA) {
        toast({ title: 'Portfolio deleted', description: `${portfolioToDelete.name} deleted.` });
      } else {
        await api.portfolios.delete(portfolioToDelete.id);
        toast({ title: 'Portfolio deleted', description: `${portfolioToDelete.name} deleted.` });
        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      }
      if (selectedPortfolioId === portfolioToDelete.id) {
        const remaining = portfolios.filter(p => p.id !== portfolioToDelete.id);
        const next = remaining.length ? remaining[0].id : null;
        dlog('Deleted selected portfolio, switching to:', next);
        setSelectedPortfolioId(next);
      }
      setShowDeleteDialog(false);
      setPortfolioToDelete(null);
    } catch (e) {
      derr('Delete failed:', e);
      toast({ title: 'Error', description: 'Failed to delete portfolio.', variant: 'destructive' });
    }
  };

  const handleSignOut = async () => {
    dlog('handleSignOut called');
    if (USE_MOCK_DATA) {
      dlog('MOCK: navigate(/auth)');
      navigate('/auth');
      return;
    }
    try {
      await supabase.auth.signOut();
      dlog('signOut complete, navigate(/auth)');
      navigate('/auth');
    } catch (e) {
      derr('Sign out failed:', e);
      toast({ title: 'Error', description: 'Failed to sign out', variant: 'destructive' });
    }
  };

  const onSwitchPortfolio = useCallback((p: Portfolio | undefined) => {
    dlog('PortfolioSwitcher.onSelect:', p?.id);
    setSelectedPortfolioId(p?.id ?? null);
  }, []);

  // Loading / auth guards to prevent flicker
  if (authLoading || portfoliosLoading) {
    dlog('Rendering Loading screen', { authLoading, portfoliosLoading });
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  if (!selectedPortfolio) {
    dwarn('Rendering "No Portfolio Selected" screen', {
      portfoliosLen: portfolios.length,
      selectedPortfolioId,
      userId: user?.id ?? null
    });
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">No Portfolio Selected</h2>
          <p className="mb-6 text-muted-foreground">
            Create your first portfolio to start tracking investments
          </p>
          <CreatePortfolioDialog />
        </div>
      </div>
    );
  }

  // Calculate metrics + period PnL
  const portfolioMetrics = calculatePortfolioMetrics(selectedPortfolio, positions, orders);
  const periodPnL = (() => {
    if (!performanceData || performanceData.length < 2) return { value: 0, percentage: 0 };
    const startValue = performanceData[0].value;
    const endValue = performanceData[performanceData.length - 1].value;
    const periodChange = endValue - startValue;
    const periodChangePercent = startValue > 0 ? (periodChange / startValue) * 100 : 0;
    return { value: periodChange, percentage: periodChangePercent };
  })();

  // -------------- UI --------------
  const isMobileView = isMobile;

  const MobileNav = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover" />
          <span className="text-xl font-bold text-foreground">Oscillo</span>
        </div>
      </div>
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setShowMobileMenu(false)}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary">
            <TrendingUp className="h-5 w-5" />
            <span>Dashboard</span>
          </div>
          <Link 
            to="/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setShowMobileMenu(false)}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link to="/">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Link>
        </Button>
      </div>
    </div>
  );

  const OrderPanel = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Quick Order</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowOrderPanel(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <OrderForm onSubmit={handleOrderSubmit} />
      </ScrollArea>
    </div>
  );

  dlog('Rendering main dashboard UI', {
    userId: user?.id ?? null,
    portfoliosLen: portfolios.length,
    selectedPortfolioId,
    positionsLen: positions.length,
    ordersLen: orders.length,
    perfLen: performanceData.length
  });

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Mobile Menu */}
        {isMobileView && (
          <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
            <SheetContent side="left" className="p-0 w-72">
              <MobileNav />
            </SheetContent>
          </Sheet>
        )}

        {/* Order Form Mobile Drawer */}
        {isMobileView && (
          <Drawer open={showOrderPanel} onOpenChange={setShowOrderPanel}>
            <DrawerContent className="h-[85vh]">
              <OrderPanel />
            </DrawerContent>
          </Drawer>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-2 md:gap-6">
                {isMobileView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileMenu(true)}
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}

                <div className="hidden md:flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover" />
                  <span className="text-xl font-bold text-foreground">Oscillo</span>
                </div>

                {/* Portfolio Selector */}
                <div className="hidden sm:block">
                  <PortfolioSwitcher
                    portfolios={portfolios}
                    selectedPortfolio={selectedPortfolio ?? undefined}
                    onSelect={(p) => { dlog('PortfolioSwitcher.onSelect (header):', p?.id); onSwitchPortfolio(p); }}
                    onCreate={async (name, investment) => {
                      dlog('onCreate portfolio:', name, investment);
                      try {
                        if (USE_MOCK_DATA) {
                          toast({ title: 'Portfolio Created', description: `${name} (${investment})` });
                        } else {
                          await api.portfolios.create({ name, initial_investment: investment });
                          toast({ title: 'Portfolio Created', description: `${name} created.` });
                          queryClient.invalidateQueries({ queryKey: ['portfolios'] });
                        }
                      } catch (e) {
                        derr('Create portfolio failed:', e);
                        toast({ title: 'Error', description: 'Failed to create portfolio.', variant: 'destructive' });
                      }
                    }}
                    onDelete={handleDeletePortfolio}
                  />
                </div>

                {/* Period Selector */}
                <div className="hidden md:block">
                  <Tabs value={selectedPeriod} onValueChange={(v) => { dlog('Period changed:', v); setSelectedPeriod(v as Period); }}>
                    <TabsList>
                      <TabsTrigger value="1D">1D</TabsTrigger>
                      <TabsTrigger value="1W">1W</TabsTrigger>
                      <TabsTrigger value="1M">1M</TabsTrigger>
                      <TabsTrigger value="YTD">YTD</TabsTrigger>
                      <TabsTrigger value="1Y">1Y</TabsTrigger>
                      <TabsTrigger value="ALL">ALL</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <CreatePortfolioDialog />
                <CashDialog portfolioId={selectedPortfolio?.id} />
                <Button variant="ghost" size="icon" asChild className="hidden md:inline-flex">
                  <Link to="/settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden md:inline-flex">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mobile Portfolio Switcher */}
            {isMobileView && (
              <div className="px-4 py-2 border-b border-border">
                <PortfolioSwitcher
                  portfolios={portfolios}
                  selectedPortfolio={selectedPortfolio ?? undefined}
                  onSelect={(p) => { dlog('PortfolioSwitcher.onSelect (mobile):', p?.id); onSwitchPortfolio(p); }}
                  onCreate={async (name, investment) => {
                    dlog('onCreate portfolio (mobile):', name, investment);
                    try {
                      if (USE_MOCK_DATA) {
                        toast({ title: 'Portfolio Created', description: `${name} (${investment})` });
                      } else {
                        await api.portfolios.create({ name, initial_investment: investment });
                        toast({ title: 'Portfolio Created', description: `${name} created.` });
                        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
                      }
                    } catch (e) {
                      derr('Create portfolio failed:', e);
                      toast({ title: 'Error', description: 'Failed to create portfolio.', variant: 'destructive' });
                    }
                  }}
                  onDelete={handleDeletePortfolio}
                />
              </div>
            )}

            {/* Mobile Period Selector */}
            {isMobileView && (
              <div className="px-4 py-2 border-b border-border">
                <Tabs value={selectedPeriod} onValueChange={(v) => { dlog('Period changed (mobile):', v); setSelectedPeriod(v as Period); }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="1D" className="flex-1">1D</TabsTrigger>
                    <TabsTrigger value="1W" className="flex-1">1W</TabsTrigger>
                    <TabsTrigger value="1M" className="flex-1">1M</TabsTrigger>
                    <TabsTrigger value="YTD" className="flex-1">YTD</TabsTrigger>
                    <TabsTrigger value="1Y" className="flex-1">1Y</TabsTrigger>
                    <TabsTrigger value="ALL" className="flex-1">ALL</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </header>

          {/* Dashboard Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  title="Total Value"
                  value={portfolioMetrics.currentValue}
                  format="currency"
                  tooltip="Current market value of all holdings"
                  className="col-span-2 md:col-span-1"
                />
                <KpiCard
                  title={`${getPeriodLabel(selectedPeriod)} P&L`}
                  value={periodPnL.value}
                  change={periodPnL.percentage}
                  format="currency"
                  changeType="percent"
                  tooltip={`Profit/loss for the selected ${getPeriodLabel(selectedPeriod).toLowerCase()} period`}
                />
                <KpiCard
                  title="Total P&L"
                  value={portfolioMetrics.totalPnl}
                  change={portfolioMetrics.totalPnlPercentage}
                  format="currency"
                  changeType="percent"
                  tooltip="All-time profit/loss"
                />
                <KpiCard
                  title="Total Return"
                  value={portfolioMetrics.totalPnlPercentage}
                  format="percent"
                  tooltip="Total return percentage"
                  className={cn(
                    "col-span-2 md:col-span-1",
                    portfolioMetrics.totalPnlPercentage >= 0 ? 'border-success/20' : 'border-destructive/20'
                  )}
                />
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div className="rounded-lg border border-border bg-card p-4 md:p-6 h-full flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                      <h3 className="text-lg font-semibold text-foreground">Performance</h3>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant={performanceViewMode === 'value' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { dlog('Perf view -> value'); setPerformanceViewMode('value'); }}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          Value
                        </Button>
                        <Button
                          variant={performanceViewMode === 'percentage' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { dlog('Perf view -> %'); setPerformanceViewMode('percentage'); }}
                          className="text-xs sm:text-sm px-2 sm:px-3"
                        >
                          %
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <PerformanceChart 
                        data={performanceData} 
                        period={selectedPeriod}
                        height={isMobileView ? 280 : 450}
                        viewMode={performanceViewMode}
                        onViewModeChange={setPerformanceViewMode}
                      />
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="h-full">
                    <AllocationDonut positions={positions} height={isMobileView ? 250 : 400} />
                  </div>
                </div>
              </div>

              {/* Holdings Table */}
              {isMobileView ? (
                <MobileHoldingsView positions={positions} />
              ) : (
                <HoldingsTable positions={positions} onExport={() => {
                  dlog('Holdings export clicked');
                  toast({ title: 'Export Started', description: 'Your holdings data is being exported to CSV.' });
                }} />
              )}

              {/* Orders Table */}
              {isMobileView ? (
                <MobileOrdersView orders={orders} />
              ) : (
                <OrdersTable 
                  orders={orders} 
                  onExport={() => {
                    dlog('Orders export clicked');
                    toast({ title: 'Export Started', description: 'Your orders data is being exported to CSV.' });
                  }} 
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Desktop Right Panel - Order Form */}
        {!isMobileView && showOrderPanel && (
          <div className="w-80 border-l border-border bg-card">
            <OrderPanel />
          </div>
        )}

        {/* Floating Action Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary-hover transition-all"
              )}
              size="icon"
              onClick={() => { dlog('Toggle order panel:', !showOrderPanel); setShowOrderPanel(!showOrderPanel); }}
            >
              {showOrderPanel ? (
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </Button>
          </TooltipTrigger>
          {!showOrderPanel && (
            <TooltipContent side="left" sideOffset={8}>
              <p>Quick Order</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        {/* Delete Portfolio Dialog */}
        <DeletePortfolioDialog
          open={showDeleteDialog}
          onOpenChange={(v) => { dlog('Delete dialog openChange:', v); setShowDeleteDialog(v); }}
          portfolio={portfolioToDelete}
          onConfirm={confirmDeletePortfolio}
        />
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
