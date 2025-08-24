-- Enable RLS on all tables
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios" 
ON public.portfolios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios" 
ON public.portfolios 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" 
ON public.portfolios 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" 
ON public.portfolios 
FOR DELETE 
USING (auth.uid() = user_id);

-- Positions policies
CREATE POLICY "Users can view positions in their portfolios" 
ON public.positions 
FOR SELECT 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create positions in their portfolios" 
ON public.positions 
FOR INSERT 
WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update positions in their portfolios" 
ON public.positions 
FOR UPDATE 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete positions in their portfolios" 
ON public.positions 
FOR DELETE 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

-- Orders policies
CREATE POLICY "Users can view orders in their portfolios" 
ON public.orders 
FOR SELECT 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can create orders in their portfolios" 
ON public.orders 
FOR INSERT 
WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can update orders in their portfolios" 
ON public.orders 
FOR UPDATE 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete orders in their portfolios" 
ON public.orders 
FOR DELETE 
USING (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));