import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Portfolio } from '@/lib/api';

interface DeletePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio | null;
  onConfirm: () => void;
}

export const DeletePortfolioDialog = ({
  open,
  onOpenChange,
  portfolio,
  onConfirm,
}: DeletePortfolioDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{portfolio?.name}"? This action cannot be undone. 
            All positions and order history for this portfolio will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Portfolio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};