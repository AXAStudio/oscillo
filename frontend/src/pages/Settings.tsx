import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, User, Shield, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();

  const handleExportData = () => {
    toast({
      title: 'Export Started',
      description: 'Your data is being exported. Download will start shortly.',
    });
  };

  const handleDeletePortfolio = () => {
    toast({
      title: 'Confirmation Required',
      description: 'Please confirm deletion in the dialog.',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </header>

      {/* Settings Content */}
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Profile Section */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Manage your account information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="John Doe" className="bg-card" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" className="bg-card" />
            </div>
            <Button>Save Changes</Button>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Configure alert preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Price Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when prices hit targets</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Daily Summary</p>
                <p className="text-sm text-muted-foreground">Receive daily portfolio updates</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Order Confirmations</p>
                <p className="text-sm text-muted-foreground">Confirm all buy/sell orders</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Data & Privacy Section */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Data & Privacy</h2>
              <p className="text-sm text-muted-foreground">Manage your data and privacy settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Export Data</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Download all your portfolio data in CSV format
              </p>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                Export All Data
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">Irreversible actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-2">Delete Portfolio</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your portfolio and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={handleDeletePortfolio}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Portfolio
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;