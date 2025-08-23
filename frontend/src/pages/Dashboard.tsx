import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { PortfolioSwitcher } from '@/components/PortfolioSwitcher';
import { KpiCard } from '@/components/KpiCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { AllocationDonut } from '@/components/AllocationDonut';
import { HoldingsTable } from '@/components/HoldingsTable';
import { MobileHoldingsView } from '@/components/MobileHoldingsView';
import { OrderForm } from '@/components/OrderForm';
import { TickerSearch } from '@/components/TickerSearch';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  mockPortfolios,
  mockPositions,
  mockSearchResults,
  mockQuotes,
  generatePerformanceData,
} from '@/lib/mock-data';
import type { Portfolio } from '@/lib/api';

type Period = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'ALL';

const Dashboard = () => {
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | undefined>(
    mockPortfolios[0]
  );
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1M');
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Mock queries - replace with real API calls
  const { data: portfolios = mockPortfolios } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => mockPortfolios,
  });

  const { data: positions = mockPositions } = useQuery({
    queryKey: ['positions', selectedPortfolio?.id],
    queryFn: async () => mockPositions,
    enabled: !!selectedPortfolio,
  });

  const { data: performanceData = [] } = useQuery({
    queryKey: ['performance', selectedPortfolio?.id, selectedPeriod],
    queryFn: async () => generatePerformanceData(selectedPeriod),
    enabled: !!selectedPortfolio,
  });

  const handleExportCSV = () => {
    toast({
      title: 'Export Started',
      description: 'Your holdings data is being exported to CSV.',
    });
  };

  const handleOrderSubmit = (order: any) => {
    console.log('Order submitted:', order);
    setShowOrderPanel(false);
  };

  const handleTickerSearch = (query: string) => {
    return mockSearchResults.filter((r) =>
      r.ticker.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  };

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

  // Calculate KPIs
  const dayChange = positions.reduce((sum, p) => sum + (p.market_value * p.day_change_percentage / 100), 0);
  const dayChangePercent = (dayChange / selectedPortfolio.current_value) * 100;

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
              
              <div className="hidden sm:block">
                <PortfolioSwitcher
                  portfolios={portfolios}
                  selectedPortfolio={selectedPortfolio}
                  onSelect={setSelectedPortfolio}
                  onCreate={(name, investment) => {
                    toast({
                      title: 'Portfolio Created',
                      description: `${name} has been created with ${investment} initial investment.`,
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden md:block">
                <TickerSearch
                  onSearch={handleTickerSearch}
                  searchResults={mockSearchResults}
                  quotes={mockQuotes}
                  onSelect={(ticker) => {
                    toast({
                      title: 'Ticker Selected',
                      description: `Viewing details for ${ticker}`,
                    });
                  }}
                />
              </div>
              
              <Button variant="ghost" size="icon" asChild className="hidden md:inline-flex">
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              
              <Button variant="ghost" size="icon" asChild className="hidden md:inline-flex">
                <Link to="/">
                  <LogOut className="h-5 w-5" />
                </Link>
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
                onCreate={(name, investment) => {
                  toast({
                    title: 'Portfolio Created',
                    description: `${name} has been created.`,
                  });
                }}
              />
            </div>
          )}

          {/* Period Selector */}
          <div className="px-4 md:px-6 py-3 overflow-x-auto">
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="1D" className="flex-1 md:flex-none">1D</TabsTrigger>
                <TabsTrigger value="1W" className="flex-1 md:flex-none">1W</TabsTrigger>
                <TabsTrigger value="1M" className="flex-1 md:flex-none">1M</TabsTrigger>
                <TabsTrigger value="YTD" className="flex-1 md:flex-none">YTD</TabsTrigger>
                <TabsTrigger value="1Y" className="flex-1 md:flex-none">1Y</TabsTrigger>
                <TabsTrigger value="ALL" className="flex-1 md:flex-none">ALL</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Dashboard Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Total Value"
                value={selectedPortfolio.current_value}
                format="currency"
                tooltip="Current market value of all holdings"
                className="col-span-2 md:col-span-1"
              />
              <KpiCard
                title="Day P&L"
                value={dayChange}
                change={dayChangePercent}
                format="currency"
                changeType="percent"
                tooltip="Today's profit/loss"
              />
              <KpiCard
                title="Total P&L"
                value={selectedPortfolio.total_pnl}
                change={selectedPortfolio.total_pnl_percentage}
                format="currency"
                changeType="percent"
                tooltip="All-time profit/loss"
              />
              <KpiCard
                title="Return"
                value={selectedPortfolio.total_pnl_percentage}
                format="percent"
                tooltip="Total return percentage"
                className="col-span-2 md:col-span-1"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="rounded-lg border border-border bg-card p-4 md:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Performance</h3>
                  <PerformanceChart 
                    data={performanceData} 
                    period={selectedPeriod} 
                    height={isMobile ? 250 : 400}
                  />
                </div>
              </div>
              <div className="lg:col-span-1">
                <AllocationDonut positions={positions} height={isMobile ? 250 : 300} />
              </div>
            </div>

            {/* Holdings Table */}
            {isMobile ? (
              <MobileHoldingsView positions={positions} />
            ) : (
              <HoldingsTable positions={positions} onExport={handleExportCSV} />
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
      <Button
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30",
          showOrderPanel && "hidden md:flex"
        )}
        size="icon"
        onClick={() => setShowOrderPanel(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Dashboard;