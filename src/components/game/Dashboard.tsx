import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X, TrendingUp, Calendar, Coins } from "lucide-react";
import type { CharacterCustomizationData } from "@/types/game";

interface DashboardProps {
  userId: string;
  characterData: CharacterCustomizationData;
  onClose: () => void;
}

interface EarningsData {
  date: string;
  amount: number;
}

const Dashboard = ({ userId, characterData, onClose }: DashboardProps) => {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [daysSinceJoining, setDaysSinceJoining] = useState(0);
  const [earningsOverTime, setEarningsOverTime] = useState<EarningsData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    // Get total earnings
    const { data: allEarnings } = await supabase
      .from("earnings_history")
      .select("amount")
      .eq("user_id", userId);

    if (allEarnings) {
      const total = allEarnings.reduce((sum, record) => sum + record.amount, 0);
      setTotalEarnings(total);
    }

    // Get monthly earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyData } = await supabase
      .from("earnings_history")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (monthlyData) {
      const monthly = monthlyData.reduce((sum, record) => sum + record.amount, 0);
      setMonthlyEarnings(monthly);
    }

    // Get account creation date
    const { data: profileData } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .single();

    if (profileData) {
      const joinDate = new Date(profileData.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - joinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysSinceJoining(diffDays);
    }

    // Get earnings over time (last 7 days, grouped by day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: timeSeriesData } = await supabase
      .from("earnings_history")
      .select("amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (timeSeriesData) {
      // Group by date
      const groupedData: Record<string, number> = {};
      timeSeriesData.forEach(record => {
        const date = new Date(record.created_at).toLocaleDateString();
        groupedData[date] = (groupedData[date] || 0) + record.amount;
      });

      const chartData = Object.entries(groupedData).map(([date, amount]) => ({
        date,
        amount,
      }));
      setEarningsOverTime(chartData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-background/95 backdrop-blur-lg rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
        <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics Dashboard
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Character Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Character</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg">
                <div className="relative">
                  {/* Simple character representation */}
                  <div 
                    className="w-32 h-48 rounded-lg flex flex-col items-center justify-center gap-2"
                    style={{ backgroundColor: characterData.body_color }}
                  >
                    {/* Head */}
                    <div 
                      className="w-16 h-16 rounded-full"
                      style={{ backgroundColor: characterData.skin_color }}
                    />
                    {/* Body indicator text */}
                    <div className="text-white text-xs font-bold">
                      Height: {characterData.height.toFixed(1)}x
                    </div>
                    <div className="text-white text-xs font-bold">
                      Width: {characterData.width.toFixed(1)}x
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <Coins className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEarnings} coins</div>
                <p className="text-xs text-muted-foreground">All time revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyEarnings} coins</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Age</CardTitle>
                <Calendar className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysSinceJoining} days</div>
                <p className="text-xs text-muted-foreground">Since joining</p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Over Time (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {earningsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--accent))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No earnings data available yet. Start selling data to see your progress!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
