import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Zap, 
  Globe, 
  Lock,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'Real-time Performance',
      description: 'Track your portfolio with live market data and instant P&L calculations.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Advanced Analytics',
      description: 'Visualize allocation, performance trends, and risk metrics at a glance.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your data is encrypted and never shared. Full control, always.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Lightning Fast',
      description: 'Zero-friction interface designed for speed and efficiency.',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Multi-Market Support',
      description: 'Track stocks, ETFs, and more across global exchanges.',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Bank-Grade Security',
      description: 'Enterprise-level encryption protects your financial data.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover" />
            <span className="text-lg sm:text-xl font-bold text-foreground">Oscillo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/auth/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/dashboard">
                <span className="hidden sm:inline">Open Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 sm:pt-32 pb-12 sm:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute -top-40 -right-40 h-60 w-60 sm:h-80 sm:w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-60 w-60 sm:h-80 sm:w-80 rounded-full bg-accent/20 blur-3xl" />
        
        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm text-primary">
              <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Lightweight. Fast. Powerful.
            </div>
            
            <h1 className="mb-4 sm:mb-6 text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground">
              Portfolio tracking
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                with zero friction
              </span>
            </h1>
            
            <p className="mb-8 sm:mb-10 text-base sm:text-xl text-muted-foreground px-4">
              Track your investments in real-time. No bloat, no complexity.
              Just clean, fast insights into your portfolio performance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button size="lg" className="text-sm sm:text-base w-full sm:w-auto" asChild>
                <Link to="/dashboard">
                  Start Tracking
                  <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-foreground">
              Everything you need, nothing you don't
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Professional-grade tools without the professional-grade complexity
            </p>
          </div>
          
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 sm:p-6 transition-all hover:bg-card-hover hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-foreground">
            Ready to take control?
          </h2>
          <p className="mb-6 sm:mb-8 text-base sm:text-lg text-muted-foreground">
            Join thousands of investors tracking their portfolios with Oscillo
          </p>
          <Button size="lg" asChild>
            <Link to="/dashboard">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-primary-hover" />
              <span className="text-sm font-semibold text-foreground">Oscillo</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              © 2024 Oscillo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;