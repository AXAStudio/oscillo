import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreatePortfolioDialogProps {
  onPortfolioCreated?: () => void;
  trigger?: React.ReactNode;
}

const CreatePortfolioDialog = ({ onPortfolioCreated, trigger }: CreatePortfolioDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a portfolio name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a portfolio",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from("portfolios").insert({
        name: name.trim(),
        user_id: session.session.user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Portfolio "${name}" created successfully`
      });

      setName("");
      setOpen(false);
      onPortfolioCreated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create portfolio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Portfolio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Portfolio</DialogTitle>
          <DialogDescription>
            Enter a name for your new investment portfolio
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-name">Portfolio Name</Label>
            <Input
              id="portfolio-name"
              placeholder="e.g., Retirement Fund, Tech Stocks"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Portfolio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePortfolioDialog;