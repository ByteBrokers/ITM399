import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, Clock, DollarSign, TrendingUp, Users, ShoppingCart, Trash2, CreditCard } from "lucide-react";
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

interface CartItem {
  dataType: string;
  quantity: number;
  pricePerUnit: number;
}

interface CheckoutDetails {
  companyName: string;
  contactEmail: string;
  businessAddress: string;
}

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [dataListings, setDataListings] = useState<DataListing[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  const [totalSellers, setTotalSellers] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>({
    companyName: "",
    contactEmail: "",
    businessAddress: "",
  });

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
      let listings: DataListing[] = Array.from(dataTypeMap.entries()).map(([type, data]) => ({
        dataType: type,
        totalAvailable: data.count,
        averagePrice: data.prices.length > 0 
          ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
          : 0,
        lastUpdated: data.lastUpdated.toISOString(),
        sellers: data.sellers.size,
      })).sort((a, b) => b.totalAvailable - a.totalAvailable);

      // If no data is available, show default sample data
      if (listings.length === 0) {
        listings = [
          {
            dataType: "Location Data",
            totalAvailable: 15,
            averagePrice: 50,
            lastUpdated: new Date(Date.now() - 3600000).toISOString(),
            sellers: 3,
          },
          {
            dataType: "Browsing History",
            totalAvailable: 12,
            averagePrice: 30,
            lastUpdated: new Date(Date.now() - 7200000).toISOString(),
            sellers: 2,
          },
          {
            dataType: "Purchase History",
            totalAvailable: 10,
            averagePrice: 45,
            lastUpdated: new Date(Date.now() - 5400000).toISOString(),
            sellers: 2,
          },
          {
            dataType: "Social Media Activity",
            totalAvailable: 8,
            averagePrice: 40,
            lastUpdated: new Date(Date.now() - 10800000).toISOString(),
            sellers: 2,
          },
          {
            dataType: "Health & Fitness Data",
            totalAvailable: 6,
            averagePrice: 60,
            lastUpdated: new Date(Date.now() - 14400000).toISOString(),
            sellers: 1,
          },
          {
            dataType: "App Usage Data",
            totalAvailable: 5,
            averagePrice: 35,
            lastUpdated: new Date(Date.now() - 18000000).toISOString(),
            sellers: 1,
          },
        ];
      }

      // Process recent transactions
      let transactions: RecentTransaction[] = earnings?.map((e) => ({
        dataType: e.data_type,
        price: e.amount,
        timestamp: e.created_at,
        company: e.company_name,
      })) || [];

      // If no transactions, show sample transactions
      if (transactions.length === 0 && listings.length > 0) {
        transactions = [
          {
            dataType: "Location Data",
            price: 50,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            company: "TechCorp",
          },
          {
            dataType: "Social Media Activity",
            price: 40,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            company: "DataInc",
          },
          {
            dataType: "Browsing History",
            price: 30,
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            company: "MarketCo",
          },
          {
            dataType: "Health & Fitness Data",
            price: 60,
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            company: "FitnessPro",
          },
        ];
      }

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

  const addToCart = (listing: DataListing) => {
    const existingItem = cart.find(item => item.dataType === listing.dataType);
    if (existingItem) {
      setCart(cart.map(item =>
        item.dataType === listing.dataType
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        dataType: listing.dataType,
        quantity: 1,
        pricePerUnit: listing.averagePrice,
      }]);
    }
    toast.success(`Added ${listing.dataType} to cart`);
  };

  const removeFromCart = (dataType: string) => {
    setCart(cart.filter(item => item.dataType !== dataType));
    toast.success("Removed from cart");
  };

  const updateQuantity = (dataType: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(dataType);
      return;
    }
    setCart(cart.map(item =>
      item.dataType === dataType ? { ...item, quantity } : item
    ));
  };

  const getTotalCost = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setShowCheckout(true);
  };

  const handleCompleteCheckout = () => {
    if (!checkoutDetails.companyName || !checkoutDetails.contactEmail || !checkoutDetails.businessAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    
    toast.success(`Purchase request submitted for ${getTotalItems()} data items (${getTotalCost()} coins). This is a demo - no actual transaction was processed.`);
    setCart([]);
    setShowCheckout(false);
    setShowCart(false);
    setCheckoutDetails({ companyName: "", contactEmail: "", businessAddress: "" });
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
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowCart(true)} 
                variant="outline"
                className="relative"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0">
                    {getTotalItems()}
                  </Badge>
                )}
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
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
                          onClick={() => addToCart(listing)}
                          disabled={listing.averagePrice === 0}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
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

      {/* Shopping Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Shopping Cart
            </DialogTitle>
            <DialogDescription>
              Review your selected data items before checkout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Your cart is empty
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <Card key={item.dataType} className="border-border">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.dataType}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.pricePerUnit} coins per unit
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.dataType, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-12 text-center font-medium">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.dataType, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <div className="text-right min-w-[80px]">
                              <p className="font-semibold text-primary">
                                {item.quantity * item.pricePerUnit} coins
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFromCart(item.dataType)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <Card className="bg-muted/50 border-border">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal ({getTotalItems()} items)</span>
                        <span className="font-medium">{getTotalCost()} coins</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span className="font-medium">0 coins</span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="text-xl font-bold text-primary">{getTotalCost()} coins</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCart(false)}>
              Continue Shopping
            </Button>
            <Button onClick={handleCheckout} disabled={cart.length === 0}>
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Complete Purchase
            </DialogTitle>
            <DialogDescription>
              Enter your business details to complete the purchase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Purchase Summary */}
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Items</span>
                    <span className="font-semibold text-foreground">{getTotalItems()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Total Cost</span>
                    <span className="text-lg font-bold text-primary">{getTotalCost()} coins</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corp"
                  value={checkoutDetails.companyName}
                  onChange={(e) => setCheckoutDetails({ ...checkoutDetails, companyName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="buyer@company.com"
                  value={checkoutDetails.contactEmail}
                  onChange={(e) => setCheckoutDetails({ ...checkoutDetails, contactEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  placeholder="123 Business St, City, Country"
                  value={checkoutDetails.businessAddress}
                  onChange={(e) => setCheckoutDetails({ ...checkoutDetails, businessAddress: e.target.value })}
                />
              </div>
            </div>

            {/* Demo Notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                ℹ️ This is a demo purchase. No actual transaction will be processed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteCheckout}>
              Complete Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;
