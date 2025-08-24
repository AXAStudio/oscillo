import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { USE_MOCK_DATA } from '@/App';
import { 
  Settings, 
  LogOut, 
  Plus, 
  Menu, 
  X, 
  Home,
  TrendingUp,
  PieChart,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';
import CreatePortfolioDialog from '@/components/CreatePortfolioDialog';
import CashDialog from '@/components/CashDialog';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
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
import {
  mockPortfolios,
  mockPositions,
  generatePerformanceData,
  mockOrders,
} from '@/lib/mock-data';
import type { Portfolio } from '@/lib/api';
import { api } from '@/lib/api';
import { 
  transformPositions, 
  transformOrders, 
  transformPerformanceData,
  getCashPosition 
} from '@/lib/api-adapters';
import { calculatePortfolioMetrics } from '@/lib/portfolio-utils';

type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'ALL';

const getPeriodStartDate = (period: Period): Date => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  switch (period) {
    case '1D':
      return startOfDay;
    case '1W':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '1M':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'YTD':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return yearStart;
    case '1Y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'ALL':
      return new Date(0); // Beginning of time
    default:
      return startOfDay;
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
  const [user, setUser] = useState<User | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1M');
  const [performanceViewMode, setPerformanceViewMode] = useState<'value' | 'percentage'>('value');
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState<Portfolio | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check authentication (skip in mock mode)
  useEffect(() => {
    if (USE_MOCK_DATA) {
      // In mock mode, use a fake user
      setUser({ email: 'dev@example.com' } as User);
      // Auto-select first portfolio in mock mode
      if (mockPortfolios.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(mockPortfolios[0]);
      }
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, selectedPortfolio]);

  // Data queries - use API or mock based on flag
  const { data: portfolios = [] } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return mockPortfolios;
      }
      return await api.portfolios.list();
    },
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions', selectedPortfolio?.id],
    queryFn: async () => {
      if (!selectedPortfolio?.id) return [];
      
      if (USE_MOCK_DATA) {
        return mockPositions;
      }
      
      const response = await api.positions.list(selectedPortfolio.id);
      return transformPositions(response);
    },
    enabled: !!selectedPortfolio,
  });

  const { data: performanceData = [] } = useQuery({
    queryKey: ['performance', selectedPortfolio?.id, selectedPeriod],
    queryFn: async () => {
      if (!selectedPortfolio?.id) return [];
      
      if (USE_MOCK_DATA) {
        return generatePerformanceData(selectedPeriod);
      }
      
      const response = await api.performance.get(selectedPortfolio.id, selectedPeriod);
      return transformPerformanceData(response);
    },
    enabled: !!selectedPortfolio,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedPortfolio?.id, selectedPeriod],
    queryFn: async () => {
      if (!selectedPortfolio?.id) return [];
      
      if (USE_MOCK_DATA) {
        const periodStart = getPeriodStartDate(selectedPeriod);
        return mockOrders.filter(o => 
          o.portfolio_id === selectedPortfolio.id &&
          new Date(o.timestamp) >= periodStart
        );
      }
      
      const response = await api.orders.list(selectedPortfolio.id);
      const transformedOrders = transformOrders(response);
      
      // Filter orders by period
      const periodStart = getPeriodStartDate(selectedPeriod);
      return transformedOrders.filter(o => 
        new Date(o.timestamp) >= periodStart
      );
    },
    enabled: !!selectedPortfolio,
  });

  const handleExportCSV = () => {
    toast({
      title: 'Export Started',
      description: 'Your holdings data is being exported to CSV.',
    });
  };

  const handleOrderSubmit = async (order: any) => {
    if (!selectedPortfolio) return;
    
    try {
      if (USE_MOCK_DATA) {
        // In mock mode, just show a success message
        toast({
          title: 'Order placed',
          description: `${order.orderType} order for ${order.quantity} shares of ${order.ticker} placed successfully.`,
        });
      } else {
        // Use API to create order
        const quantity = order.orderType === 'SELL' ? -order.quantity : order.quantity;
        await api.orders.create(selectedPortfolio.id, {
          ticker: order.ticker,
          quantity,
          price: order.price,
        });
        toast({
          title: 'Order placed',
          description: `Your order has been executed successfully.`,
        });
        // Refetch orders and positions
        queryClient.invalidateQueries({ queryKey: ['orders', selectedPortfolio.id] });
        queryClient.invalidateQueries({ queryKey: ['positions', selectedPortfolio.id] });
      }
      setShowOrderPanel(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    setPortfolioToDelete(portfolio);
    setShowDeleteDialog(true);
  };

  const confirmDeletePortfolio = async () => {
    if (!portfolioToDelete) return;

    try {
      if (USE_MOCK_DATA) {
        toast({
          title: 'Portfolio deleted',
          description: `${portfolioToDelete.name} has been deleted successfully.`,
        });
      } else {
        await api.portfolios.delete(portfolioToDelete.id);
        toast({
          title: 'Portfolio deleted',
          description: `${portfolioToDelete.name} has been deleted successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      }
      
      // If deleting the current portfolio, select another one
      if (selectedPortfolio?.id === portfolioToDelete.id) {
        const remainingPortfolios = portfolios.filter(p => p.id !== portfolioToDelete.id);
        setSelectedPortfolio(remainingPortfolios.length > 0 ? remainingPortfolios[0] : undefined);
      }
      
      setShowDeleteDialog(false);
      setPortfolioToDelete(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete portfolio. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    if (USE_MOCK_DATA) {
      // In mock mode, just navigate to auth page
      navigate('/auth');
      return;
    }
    
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  // Persist selection per-user so we can auto-select on next load
  const selectPortfolio = useCallback((p: Portfolio | undefined) => {
    setSelectedPortfolio(p);
    if (!USE_MOCK_DATA) {
      const key = `oscillo:lastPortfolio:${user?.id ?? 'anon'}`;
      if (p?.id) localStorage.setItem(key, p.id);
      else localStorage.removeItem(key);
    }
  }, [USE_MOCK_DATA, user?.id]);

  if (!selectedPortfolio) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">No Portfolio Selected</h2>
          <p className="mb-6 text-muted-foreground">
            Create your first portfolio to start tracking investments
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        </div>
      </div>
    );
  }

  // Calculate portfolio metrics
  const portfolioMetrics = calculatePortfolioMetrics(
    selectedPortfolio, 
    positions, 
    USE_MOCK_DATA ? mockOrders : orders
  );
  
  // Calculate period P&L based on performance data
  const calculatePeriodPnL = () => {
    if (!performanceData || performanceData.length < 2) return { value: 0, percentage: 0 };
    
    const startValue = performanceData[0].value;
    const endValue = performanceData[performanceData.length - 1].value;
    const periodChange = endValue - startValue;
    const periodChangePercent = startValue > 0 ? (periodChange / startValue) * 100 : 0;
    
    return { value: periodChange, percentage: periodChangePercent };
  };
  
  const periodPnL = calculatePeriodPnL();

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowOrderPanel(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <OrderForm onSubmit={handleOrderSubmit} />
      </ScrollArea>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
      {/* Mobile Menu */}
      {isMobile && (
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetContent side="left" className="p-0 w-72">
            <MobileNav />
          </SheetContent>
        </Sheet>
      )}

      {/* Order Form Mobile Drawer */}
      {isMobile && (
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
              {isMobile && (
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
              
              {/* Portfolio Selector - After logo */}
              <div className="hidden sm:block">
                <PortfolioSwitcher
                  portfolios={portfolios}
                  selectedPortfolio={selectedPortfolio}
                  onSelect={setSelectedPortfolio}
                  onCreate={async (name, investment) => {
                    try {
                      if (USE_MOCK_DATA) {
                        toast({
                          title: 'Portfolio Created',
                          description: `${name} has been created with ${investment} initial investment.`,
                        });
                      } else {
                        await api.portfolios.create({ name, initial_investment: investment });
                        toast({
                          title: 'Portfolio Created',
                          description: `${name} has been created successfully.`,
                        });
                        queryClient.invalidateQueries({ queryKey: ['portfolios'] });
                      }
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to create portfolio.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  onDelete={handleDeletePortfolio}
                />
              </div>
              
              {/* Period Selector - After portfolio selector */}
              <div className="hidden md:block">
                <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
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
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="hidden md:inline-flex"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Portfolio Switcher */}
          {isMobile && (
            <div className="px-4 py-2 border-b border-border">
              <PortfolioSwitcher
                portfolios={portfolios}
                selectedPortfolio={selectedPortfolio}
                onSelect={setSelectedPortfolio}
                onCreate={async (name, investment) => {
                  try {
                    if (USE_MOCK_DATA) {
                      toast({
                        title: 'Portfolio Created',
                        description: `${name} has been created with ${investment} initial investment.`,
                      });
                    } else {
                      await api.portfolios.create({ name, initial_investment: investment });
                      toast({
                        title: 'Portfolio Created',
                        description: `${name} has been created successfully.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
                    }
                  } catch (error) {
                    toast({
                      title: 'Error',
                      description: 'Failed to create portfolio.',
                      variant: 'destructive',
                    });
                  }
                }}
                onDelete={handleDeletePortfolio}
              />
            </div>
          )}

          {/* Mobile Period Selector - Below Portfolio Switcher */}
          {isMobile && (
            <div className="px-4 py-2 border-b border-border">
              <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
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
                        onClick={() => setPerformanceViewMode('value')}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Value
                      </Button>
                      <Button
                        variant={performanceViewMode === 'percentage' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPerformanceViewMode('percentage')}
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
                      height={isMobile ? 280 : 450}
                      viewMode={performanceViewMode}
                      onViewModeChange={setPerformanceViewMode}
                    />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-full">
                  <AllocationDonut positions={positions} height={isMobile ? 250 : 400} />
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            {isMobile ? (
              <MobileHoldingsView positions={positions} />
            ) : (
              <HoldingsTable positions={positions} onExport={handleExportCSV} />
            )}

            {/* Orders Table */}
            {isMobile ? (
              <MobileOrdersView orders={orders} />
            ) : (
              <OrdersTable 
                orders={orders} 
                onExport={() => {
                  toast({
                    title: 'Export Started',
                    description: 'Your orders data is being exported to CSV.',
                  });
                }} 
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop Right Panel - Order Form */}
      {!isMobile && showOrderPanel && (
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
            onClick={() => setShowOrderPanel(!showOrderPanel)}
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
        onOpenChange={setShowDeleteDialog}
        portfolio={portfolioToDelete}
        onConfirm={confirmDeletePortfolio}
      />
    </div>
    </TooltipProvider>
  );
};

export default Dashboard;