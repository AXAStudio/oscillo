import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CashDialogProps {
  portfolioId?: string;
  onTransactionComplete?: () => void;
}

const CashDialog = ({ portfolioId, onTransactionComplete }: CashDialogProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Get current cash position
  const { data: cashPosition } = useQuery({
    queryKey: ["cash-position", portfolioId],
    queryFn: async () => {
      if (!portfolioId) return null;
      const { data, error } = await supabase
        .from("positions")
        .select("quantity")
        .eq("portfolio_id", portfolioId)
        .eq("ticker", "CA$H")
        .maybeSingle();
      
      if (error) throw error;
      return data?.quantity || 0;
    },
    enabled: !!portfolioId
  });

  const handleTransaction = async (type: "deposit" | "withdraw") => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    if (!portfolioId) {
      toast({
        title: "Error",
        description: "Please select a portfolio first",
        variant: "destructive"
      });
      return;
    }

    const transactionAmount = parseFloat(amount);
    const finalAmount = type === "deposit" ? transactionAmount : -transactionAmount;

    if (type === "withdraw" && cashPosition !== null && transactionAmount > cashPosition) {
      toast({
        title: "Error",
        description: "Insufficient cash balance",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Record the order
      const { error: orderError } = await supabase.from("orders").insert({
        portfolio_id: portfolioId,
        ticker: "CA$H",
        name: "Cash",
        quantity: finalAmount,
        price: 1,
        sector: "Cash"
      });

      if (orderError) throw orderError;

      // Update position
      const { error: positionError } = await supabase.rpc("increment_quantity", {
        p_portfolio_id: portfolioId,
        p_ticker: "CA$H",
        p_quantity: finalAmount,
        p_name: "Cash",
        p_sector: "Cash"
      });

      if (positionError) throw positionError;

      // Re-fetch the same data the dashboard relies on
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders", portfolioId] }),
        queryClient.invalidateQueries({ queryKey: ["positions", portfolioId] }),
        queryClient.invalidateQueries({ queryKey: ["cash-position", portfolioId] }),
        queryClient.invalidateQueries({ queryKey: ["portfolios"] }),
        // Optional: performance for this portfolio (covers any period keys)
        queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey[0] === "performance" &&
            q.queryKey[1] === portfolioId,
        }),
      ]);

     toast({
        title: "Success",
        description: `Successfully ${type === "deposit" ? "deposited" : "withdrew"} $${transactionAmount.toFixed(2)}`
      });

      setAmount("");
      setOpen(false);
      onTransactionComplete?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${type} cash`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Cash
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Cash</DialogTitle>
          <DialogDescription>
            Deposit or withdraw cash from your portfolio
            {cashPosition !== null && cashPosition !== undefined && (
              <span className="block mt-2 font-semibold">
                Current Balance: ${cashPosition.toFixed(2)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="deposit" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit" className="gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Withdraw
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="deposit" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount to Deposit</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
            <Button 
              onClick={() => handleTransaction("deposit")} 
              className="w-full"
              disabled={loading || !portfolioId}
            >
              {loading ? "Processing..." : "Deposit Cash"}
            </Button>
          </TabsContent>
          
          <TabsContent value="withdraw" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount to Withdraw</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                max={cashPosition || 0}
                disabled={loading}
              />
            </div>
            <Button 
              onClick={() => handleTransaction("withdraw")} 
              className="w-full"
              variant="destructive"
              disabled={loading || !portfolioId}
            >
              {loading ? "Processing..." : "Withdraw Cash"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CashDialog;