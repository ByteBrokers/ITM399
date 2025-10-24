import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, Clock, DollarSign, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

interface DataListing {
  dataType: string;
  totalAvailable: number;
  averagePrice: number;
  lastUpdated: string;
  sellers: number;
}

interface RecentTransaction {
  dataType: string;
  price: number;
  timestamp: string;
  company: string;
}

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [dataListings, setDataListings] = useState<DataListing[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  const [totalSellers, setTotalSellers] = useState(0);

  useEffect(() => {
    checkAuth();
    loadBuyerData();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadBuyerData = async () => {
    try {
      // Get all game states to see available data
      const { data: gameStates, error: gameError } = await supabase
        .from("game_state")
        .select("data_types, user_id");

      if (gameError) throw gameError;

      // Get recent transactions
      const { data: earnings, error: earningsError } = await supabase
        .from("earnings_history")
        .select("data_type, amount, created_at, company_name")
        .order("created_at", { ascending: false })
        .limit(10);

      if (earningsError) throw earningsError;

      // Process data for listings
      const dataTypeMap = new Map<string, { count: number; prices: number[]; lastUpdated: Date; sellers: Set<string> }>();

      // Aggregate data from game states
      gameStates?.forEach((state) => {
        const dataTypes = state.data_types as Record<string, { owned: boolean; value: number; lastCollectedTime?: number }>;
        Object.entries(dataTypes).forEach(([type, data]) => {
          if (data.owned) {
            if (!dataTypeMap.has(type)) {
              dataTypeMap.set(type, { 
                count: 0, 
                prices: [], 
                lastUpdated: new Date(0),
                sellers: new Set()
              });
            }
            const existing = dataTypeMap.get(type)!;
            existing.count++;
            existing.sellers.add(state.user_id);
            
            if (data.lastCollectedTime) {
              const updateTime = new Date(data.lastCollectedTime);
              if (updateTime > existing.lastUpdated) {
                existing.lastUpdated = updateTime;
              }
            }
          }
        });
      });

      // Add pricing data from earnings history
      earnings?.forEach((earning) => {
        if (dataTypeMap.has(earning.data_type)) {
          dataTypeMap.get(earning.data_type)!.prices.push(earning.amount);
        }
      });

      // Convert to listings array
      const listings: DataListing[] = Array.from(dataTypeMap.entries()).map(([type, data]) => ({
        dataType: type,
        totalAvailable: data.count,
        averagePrice: data.prices.length > 0 
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : 0,
        lastUpdated: data.lastUpdated.toISOString(),
        sellers: data.sellers.size,
      })).sort((a, b) => b.totalAvailable - a.totalAvailable);

      // Process recent transactions
      const transactions: RecentTransaction[] = earnings?.map((e) => ({
        dataType: e.data_type,
        price: e.amount,
        timestamp: e.created_at,
        company: e.company_name,
      })) || [];

      setDataListings(listings);
      setRecentTransactions(transactions);
      setTotalDataPoints(listings.reduce((sum, l) => sum + l.totalAvailable, 0));
      setTotalSellers(new Set(gameStates?.map(s => s.user_id)).size);
    } catch (error) {
      console.error("Error loading buyer data:", error);
      toast.error("Failed to load data listings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading marketplace data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Data Marketplace</h1>
                <p className="text-sm text-muted-foreground">Browse and purchase available data</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Data Points</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalDataPoints}</div>
              <p className="text-xs text-muted-foreground mt-1">Available for purchase</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sellers</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalSellers}</div>
              <p className="text-xs text-muted-foreground mt-1">Contributing data</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Data Categories</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{dataListings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Types available</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Data Listings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Available Data</CardTitle>
            <CardDescription>Browse current data inventory and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            {dataListings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Type</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-center">Sellers</TableHead>
                    <TableHead className="text-right">Avg. Price</TableHead>
                    <TableHead className="text-right">Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataListings.map((listing) => (
                    <TableRow key={listing.dataType}>
                      <TableCell className="font-medium">{listing.dataType}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{listing.totalAvailable}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {listing.sellers}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {listing.averagePrice > 0 ? `${listing.averagePrice} coins` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {listing.lastUpdated !== new Date(0).toISOString() 
                          ? formatDate(listing.lastUpdated)
                          : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          onClick={() => toast.info("Purchase functionality coming soon!")}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No data currently available in the marketplace
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">Recent Market Activity</CardTitle>
            </div>
            <CardDescription>Latest data transactions in the marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.dataType}</p>
                        <p className="text-sm text-muted-foreground">Purchased by {transaction.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary flex items-center gap-1 justify-end">
                        <DollarSign className="h-4 w-4" />
                        {transaction.price} coins
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                No recent transactions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerDashboard;
