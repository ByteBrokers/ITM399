import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X, TrendingUp, Calendar, Coins, Edit, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { CharacterCustomizationData } from "@/types/game";

interface DashboardProps {
  userId: string;
  characterData: CharacterCustomizationData;
  onClose: () => void;
  onEditCharacter: () => void;
}

interface EarningsData {
  date: string;
  amount: number;
}

const Dashboard = ({ userId, characterData, onClose, onEditCharacter }: DashboardProps) => {
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
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">
            Analytics Dashboard
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Character Preview */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-semibold">Your Character</CardTitle>
              <Button onClick={onEditCharacter} size="sm" variant="outline" className="rounded-lg">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 bg-gradient-overlay rounded-xl">
                <div className="relative flex flex-col items-center gap-4">
                  {/* Roblox-style character representation */}
                  <div className="relative" style={{ transform: 'perspective(500px) rotateY(-15deg)' }}>
                    {/* Hair - on top of head */}
                    <div 
                      className="w-17 h-6 mx-auto border border-border/50 shadow-md"
                      style={{ 
                        backgroundColor: '#2c1810',
                        transform: 'translateZ(22px) translateY(-2px)',
                        marginBottom: '-2px'
                      }}
                    />
                    
                    {/* Head - cubic block */}
                    <div 
                      className="w-16 h-16 mx-auto border-2 border-border shadow-lg relative"
                      style={{ 
                        backgroundColor: characterData.skin_color,
                        transform: 'translateZ(20px)'
                      }}
                    >
                      {/* Eyes */}
                      <div className="absolute flex gap-4 top-4 left-1/2 -translate-x-1/2">
                        <div className="w-2.5 h-2.5 bg-black" />
                        <div className="w-2.5 h-2.5 bg-black" />
                      </div>
                      {/* Mouth */}
                      <div className="absolute w-5 h-1.5 bg-black bottom-3 left-1/2 -translate-x-1/2" />
                    </div>
                    
                    {/* Torso - rectangular block */}
                    <div 
                      className="mt-1 border-2 border-border shadow-xl relative"
                      style={{ 
                        backgroundColor: characterData.body_color,
                        width: `${60 * characterData.width}px`,
                        height: `${90 * characterData.height}px`,
                        margin: '4px auto 0',
                        transform: 'translateZ(10px)'
                      }}
                    >
                      {/* Left Arm */}
                      <div 
                        className="absolute border border-border/50"
                        style={{
                          backgroundColor: characterData.skin_color,
                          width: '14px',
                          height: '60px',
                          left: '-16px',
                          top: '4px',
                          transform: 'translateZ(5px)'
                        }}
                      />
                      {/* Right Arm */}
                      <div 
                        className="absolute border border-border/50"
                        style={{
                          backgroundColor: characterData.skin_color,
                          width: '14px',
                          height: '60px',
                          right: '-16px',
                          top: '4px',
                          transform: 'translateZ(5px)'
                        }}
                      />
                    </div>
                    
                    {/* Legs */}
                    <div className="flex gap-1 justify-center mt-1">
                      <div 
                        className="border border-border/50"
                        style={{
                          backgroundColor: characterData.body_color,
                          width: '18px',
                          height: `${50 * characterData.height}px`,
                          transform: 'translateZ(5px)'
                        }}
                      />
                      <div 
                        className="border border-border/50"
                        style={{
                          backgroundColor: characterData.body_color,
                          width: '18px',
                          height: `${50 * characterData.height}px`,
                          transform: 'translateZ(5px)'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Character stats */}
                  <div className="text-center space-y-2 mt-4">
                    <div className="text-sm font-medium text-muted-foreground">
                      Height: {characterData.height.toFixed(1)}x · Width: {characterData.width.toFixed(1)}x
                    </div>
                    <div className="flex gap-3 justify-center">
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                        <div 
                          className="w-4 h-4 rounded border border-border shadow-sm"
                          style={{ backgroundColor: characterData.body_color }}
                        />
                        <span className="text-xs font-medium text-foreground">Body</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                        <div 
                          className="w-4 h-4 rounded-full border border-border shadow-sm"
                          style={{ backgroundColor: characterData.skin_color }}
                        />
                        <span className="text-xs font-medium text-foreground">Skin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{totalEarnings}</div>
                <p className="text-xs text-muted-foreground mt-1">All time revenue</p>
                <Button 
                  onClick={() => toast.info("This is a work in progress")}
                  size="sm" 
                  className="w-full mt-3"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Earnings</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{monthlyEarnings}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Account Age</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{daysSinceJoining}</div>
                <p className="text-xs text-muted-foreground mt-1">Days active</p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Chart */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Earnings Trend</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Last 7 days performance</p>
            </CardHeader>
            <CardContent>
              {earningsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickMargin={8}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickMargin={8}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-muted-foreground">No earnings data yet</div>
                    <p className="text-sm text-muted-foreground">Start selling data to track your progress</p>
                  </div>
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
