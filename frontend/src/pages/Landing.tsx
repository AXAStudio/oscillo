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
  return (
    <div className="min-h-screen bg-gradient-to-tr from-background via-primary/10 to-primary/20">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="hidden md:flex items-center gap-2">
            <img
              src="/logo-192x192.png"  // lives in /public
              alt="Oscillo logo"
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="text-xl font-bold text-foreground">Oscillo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 sm:pt-32 pb-12 sm:pb-20 min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute -top-40 -right-40 h-60 w-60 sm:h-80 sm:w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-60 w-60 sm:h-80 sm:w-80 rounded-full bg-accent/10 blur-3xl" />
        
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
                <Link to="/auth">
                  Start Tracking
                  <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;