import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const DeleteAccountDialog = () => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: "Error",
        description: "Please type DELETE to confirm",
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
          description: "You must be logged in to delete your account",
          variant: "destructive"
        });
        return;
      }

      // Delete all user's portfolios (cascade will handle positions and orders)
      const { error: portfoliosError } = await supabase
        .from("portfolios")
        .delete()
        .eq("user_id", session.session.user.id);

      if (portfoliosError) throw portfoliosError;

      // Delete the user account
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        session.session.user.id
      );

      // If admin deletion fails, try user deletion
      if (deleteError) {
        // Sign out the user as a fallback
        await supabase.auth.signOut();
        
        toast({
          title: "Account Data Deleted",
          description: "Your portfolio data has been deleted. Please contact support to complete account deletion.",
        });
      } else {
        toast({
          title: "Account Deleted",
          description: "Your account and all data have been permanently deleted",
        });
      }

      // Clear local storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </span>
            <span className="block font-semibold text-destructive">
              All your portfolios, positions, and order history will be permanently deleted.
            </span>
            <div className="space-y-2 pt-4">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                disabled={loading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDeleteAccount();
            }}
            disabled={loading || confirmText !== "DELETE"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;