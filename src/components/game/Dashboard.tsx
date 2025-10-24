import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { X, TrendingUp, Calendar, Coins, Edit, Wallet, FileText, Building2, Package, Trophy, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CharacterCustomizationData, QuestionnaireData, Company, DataType } from "@/types/game";

const companies: Company[] = [
  {
    name: "TechCorp",
    color: 0x4caf50,
    interests: ["Location Data", "Device Usage", "Digital Habits"],
    multiplier: 1.2,
    description: "We optimize user experiences with location and usage data!",
  },
  {
    name: "AdVentures",
    color: 0xff9800,
    interests: ["Shopping Habits", "Social Media", "Interests"],
    multiplier: 1.5,
    description: "Premium advertising solutions need your shopping and social data!",
  },
  {
    name: "HealthTech",
    color: 0x2196f3,
    interests: ["Health Data", "Fitness Data", "Location Data"],
    multiplier: 1.8,
    description: "Advancing healthcare through data-driven insights!",
  },
  {
    name: "DataMega",
    color: 0x9c27b0,
    interests: ["Digital Habits", "Shopping Habits", "Social Media", "Privacy Preferences"],
    multiplier: 1.1,
    description: "Big data solutions for the modern world!",
  },
];

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

interface CompanyData {
  name: string;
  value: number;
}

interface DataTypeData {
  name: string;
  value: number;
}

interface CurrentInventoryItem {
  name: string;
  value: number;
  bestCompany: string;
  potentialEarnings: number;
}

const Dashboard = ({ userId, characterData, onClose, onEditCharacter }: DashboardProps) => {
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [daysSinceJoining, setDaysSinceJoining] = useState(0);
  const [earningsOverTime, setEarningsOverTime] = useState<EarningsData[]>([]);
  const [salesByCompany, setSalesByCompany] = useState<CompanyData[]>([]);
  const [salesByDataType, setSalesByDataType] = useState<DataTypeData[]>([]);
  const [currentInventory, setCurrentInventory] = useState<CurrentInventoryItem[]>([]);
  const [showQuestionnaireEditor, setShowQuestionnaireEditor] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDetails, setWithdrawalDetails] = useState({
    fullName: "",
    bankAccount: "",
    email: "",
  });
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    name: "",
    age: "",
    location: "",
    occupation: "",
    devices: [],
    social_media: [],
    screen_time: "",
    shopping_freq: "",
    shopping_categories: [],
    fitness: "",
    interests: "",
    privacy_concern: "",
    data_sharing: "",
    email: "",
  });

  useEffect(() => {
    loadDashboardData();
    loadQuestionnaireData();
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

    // Get sales by company
    const { data: companyData } = await supabase
      .from("earnings_history")
      .select("company_name, amount")
      .eq("user_id", userId);

    if (companyData) {
      const companyTotals: Record<string, number> = {};
      companyData.forEach(record => {
        companyTotals[record.company_name] = (companyTotals[record.company_name] || 0) + record.amount;
      });
      const companyChartData = Object.entries(companyTotals).map(([name, value]) => ({
        name,
        value,
      }));
      setSalesByCompany(companyChartData);
    }

    // Get sales by data type
    const { data: dataTypeData } = await supabase
      .from("earnings_history")
      .select("data_type, amount")
      .eq("user_id", userId);

    if (dataTypeData) {
      const dataTypeTotals: Record<string, number> = {};
      dataTypeData.forEach(record => {
        dataTypeTotals[record.data_type] = (dataTypeTotals[record.data_type] || 0) + record.amount;
      });
      const dataTypeChartData = Object.entries(dataTypeTotals).map(([name, value]) => ({
        name,
        value,
      }));
      setSalesByDataType(dataTypeChartData);
    }

    // Get current inventory (owned data from game_state)
    const { data: gameStateData } = await supabase
      .from("game_state")
      .select("data_types")
      .eq("user_id", userId)
      .single();

    if (gameStateData && gameStateData.data_types) {
      const dataTypes = gameStateData.data_types as unknown as Record<string, DataType>;
      const inventoryItems: CurrentInventoryItem[] = [];

      Object.entries(dataTypes).forEach(([dataTypeName, dataTypeInfo]) => {
        if (dataTypeInfo.owned) {
          // Find best company for this data type
          let bestCompany = "";
          let maxEarnings = dataTypeInfo.value;

          companies.forEach(company => {
            if (company.interests.includes(dataTypeName)) {
              const potentialEarnings = Math.floor(dataTypeInfo.value * company.multiplier);
              if (potentialEarnings > maxEarnings) {
                maxEarnings = potentialEarnings;
                bestCompany = company.name;
              }
            }
          });

          if (!bestCompany) {
            // If no company is interested, show base value
            bestCompany = "Any Company";
            maxEarnings = dataTypeInfo.value;
          }

          inventoryItems.push({
            name: dataTypeName,
            value: dataTypeInfo.value,
            bestCompany,
            potentialEarnings: maxEarnings,
          });
        }
      });

      // Sort by potential earnings
      inventoryItems.sort((a, b) => b.potentialEarnings - a.potentialEarnings);
      setCurrentInventory(inventoryItems);
    }
  };

  const loadQuestionnaireData = async () => {
    const { data } = await supabase
      .from("questionnaire_responses")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setQuestionnaireData({
        name: data.name || "",
        age: data.age || "",
        location: data.location || "",
        occupation: data.occupation || "",
        devices: data.devices || [],
        social_media: data.social_media || [],
        screen_time: data.screen_time || "",
        shopping_freq: data.shopping_freq || "",
        shopping_categories: data.shopping_categories || [],
        fitness: data.fitness || "",
        interests: data.interests || "",
        privacy_concern: data.privacy_concern || "",
        data_sharing: data.data_sharing || "",
        email: data.email || "",
      });
    }
  };

  const handleCheckboxChange = (field: keyof QuestionnaireData, value: string, checked: boolean) => {
    const currentValues = (questionnaireData[field] as string[]) || [];
    setQuestionnaireData({
      ...questionnaireData,
      [field]: checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value),
    });
  };

  const handleUpdateQuestionnaire = async () => {
    try {
      await supabase
        .from("questionnaire_responses")
        .update({
          name: questionnaireData.name,
          age: questionnaireData.age,
          location: questionnaireData.location,
          occupation: questionnaireData.occupation,
          devices: questionnaireData.devices,
          social_media: questionnaireData.social_media,
          screen_time: questionnaireData.screen_time,
          shopping_freq: questionnaireData.shopping_freq,
          shopping_categories: questionnaireData.shopping_categories,
          fitness: questionnaireData.fitness,
          interests: questionnaireData.interests,
          privacy_concern: questionnaireData.privacy_concern,
          data_sharing: questionnaireData.data_sharing,
          email: questionnaireData.email,
        })
        .eq("user_id", userId);

      toast.success("Information updated successfully!");
      setShowQuestionnaireEditor(false);
    } catch (error) {
      console.error("Error updating questionnaire:", error);
      toast.error("Failed to update information");
    }
  };

  const handleWithdrawal = () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!withdrawalDetails.fullName || !withdrawalDetails.bankAccount || !withdrawalDetails.email) {
      toast.error("Please fill in all details");
      return;
    }
    if (parseFloat(withdrawalAmount) > totalEarnings) {
      toast.error("Insufficient balance");
      return;
    }

    // Mock withdrawal - just show success message
    toast.success(`Withdrawal request submitted! You will receive ${withdrawalAmount} NZD to your account.`);
    setShowWithdrawalDialog(false);
    setWithdrawalAmount("");
    setWithdrawalDetails({ fullName: "", bankAccount: "", email: "" });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-card backdrop-blur-xl border-b border-border p-6 flex justify-between items-center shadow-sm">
            <h2 className="text-2xl font-bold text-foreground">
              Analytics Dashboard
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowQuestionnaireEditor(true)} 
                variant="outline" 
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Update Information
              </Button>
              <Button onClick={onClose} variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
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

          {/* Summary Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Overview</h3>
            <p className="text-sm text-muted-foreground">Key metrics and account statistics</p>
          </div>

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
                  onClick={() => setShowWithdrawalDialog(true)}
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

          {/* Performance Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Performance</h3>
            <p className="text-sm text-muted-foreground">Track your earnings over time</p>
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

          {/* Sales Analytics Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Sales Analytics</h3>
            <p className="text-sm text-muted-foreground">Breakdown by company and data category</p>
          </div>

          {/* Sales by Company and Data Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales by Company */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Sales by Company</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Revenue breakdown</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesByCompany.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByCompany}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={80}
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
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No sales data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales by Data Type */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Sales by Category</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Data type breakdown</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesByDataType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={salesByDataType}
                        cx="50%"
                        cy="45%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={90}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        style={{ fontSize: '11px' }}
                      >
                        {salesByDataType.map((entry, index) => {
                          const colors = [
                            '#3b82f6', // blue
                            '#8b5cf6', // purple
                            '#ec4899', // pink
                            '#f59e0b', // amber
                            '#10b981', // emerald
                            '#06b6d4', // cyan
                            '#f97316', // orange
                            '#6366f1', // indigo
                          ];
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors[index % colors.length]}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.75rem",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                        formatter={(value) => [`${value} coins`, 'Revenue']}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={50}
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span style={{ color: "hsl(var(--foreground))", fontSize: '12px' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                    No sales data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Inventory Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Your Inventory</h3>
            <p className="text-sm text-muted-foreground">Current data available and potential earnings</p>
          </div>

          {/* Top Earners Leaderboard */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Current Top Earners</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Available data and best potential earnings</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentInventory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Data Category</TableHead>
                      <TableHead>Best Company</TableHead>
                      <TableHead className="text-right">Base Value</TableHead>
                      <TableHead className="text-right">Potential</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInventory.slice(0, 5).map((item, index) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">
                          {index === 0 && <span className="text-yellow-500">🥇</span>}
                          {index === 1 && <span className="text-gray-400">🥈</span>}
                          {index === 2 && <span className="text-amber-600">🥉</span>}
                          {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.bestCompany}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.value}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{item.potentialEarnings}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No data available in inventory
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    {/* Questionnaire Editor Modal */}
    {showQuestionnaireEditor && (
      <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border p-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Update Your Information</h2>
            <Button onClick={() => setShowQuestionnaireEditor(false)} variant="ghost" size="icon" className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={questionnaireData.name}
                    onChange={(e) => setQuestionnaireData({ ...questionnaireData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-age">Age Range</Label>
                  <Select value={questionnaireData.age} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, age: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45-54">45-54</SelectItem>
                      <SelectItem value="55+">55+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={questionnaireData.location}
                    onChange={(e) => setQuestionnaireData({ ...questionnaireData, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-occupation">Occupation</Label>
                  <Input
                    id="edit-occupation"
                    value={questionnaireData.occupation}
                    onChange={(e) => setQuestionnaireData({ ...questionnaireData, occupation: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Digital Life */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Digital Life & Habits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-3 block">Devices You Use</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "smartphone", label: "Smartphone" },
                      { value: "laptop", label: "Laptop" },
                      { value: "tablet", label: "Tablet" },
                      { value: "smartwatch", label: "Smart Watch" },
                      { value: "smarthome", label: "Smart Home Devices" },
                    ].map((device) => (
                      <div key={device.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${device.value}`}
                          checked={questionnaireData.devices?.includes(device.value)}
                          onCheckedChange={(checked) => handleCheckboxChange("devices", device.value, checked as boolean)}
                        />
                        <Label htmlFor={`edit-${device.value}`} className="cursor-pointer">{device.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Social Media Platforms</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "facebook", label: "Facebook" },
                      { value: "instagram", label: "Instagram" },
                      { value: "twitter", label: "Twitter/X" },
                      { value: "linkedin", label: "LinkedIn" },
                      { value: "tiktok", label: "TikTok" },
                      { value: "youtube", label: "YouTube" },
                    ].map((platform) => (
                      <div key={platform.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${platform.value}`}
                          checked={questionnaireData.social_media?.includes(platform.value)}
                          onCheckedChange={(checked) => handleCheckboxChange("social_media", platform.value, checked as boolean)}
                        />
                        <Label htmlFor={`edit-${platform.value}`} className="cursor-pointer">{platform.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-screen-time">Daily Hours Online</Label>
                  <Select value={questionnaireData.screen_time} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, screen_time: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-3">1-3 hours</SelectItem>
                      <SelectItem value="4-6">4-6 hours</SelectItem>
                      <SelectItem value="7-9">7-9 hours</SelectItem>
                      <SelectItem value="10+">10+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Shopping & Health */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Shopping & Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-shopping-freq">Online Shopping Frequency</Label>
                  <Select value={questionnaireData.shopping_freq} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, shopping_freq: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="rarely">Rarely</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-3 block">Shopping Categories</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "clothing", label: "Clothing" },
                      { value: "electronics", label: "Electronics" },
                      { value: "food", label: "Food & Groceries" },
                      { value: "books", label: "Books" },
                      { value: "travel", label: "Travel" },
                      { value: "health", label: "Health Products" },
                    ].map((category) => (
                      <div key={category.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${category.value}`}
                          checked={questionnaireData.shopping_categories?.includes(category.value)}
                          onCheckedChange={(checked) => handleCheckboxChange("shopping_categories", category.value, checked as boolean)}
                        />
                        <Label htmlFor={`edit-${category.value}`} className="cursor-pointer">{category.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-fitness">Fitness Tracking</Label>
                  <Select value={questionnaireData.fitness} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, fitness: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes-regularly">Yes, regularly</SelectItem>
                      <SelectItem value="yes-occasionally">Yes, occasionally</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-interests">Interests/Hobbies</Label>
                  <Textarea
                    id="edit-interests"
                    value={questionnaireData.interests}
                    onChange={(e) => setQuestionnaireData({ ...questionnaireData, interests: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Privacy & Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-privacy">Privacy Concern Level</Label>
                  <Select value={questionnaireData.privacy_concern} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, privacy_concern: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very-concerned">Very concerned</SelectItem>
                      <SelectItem value="somewhat-concerned">Somewhat concerned</SelectItem>
                      <SelectItem value="not-very-concerned">Not very concerned</SelectItem>
                      <SelectItem value="not-concerned">Not concerned at all</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-data-sharing">Data Sharing for Benefits</Label>
                  <Select value={questionnaireData.data_sharing} onValueChange={(value) => setQuestionnaireData({ ...questionnaireData, data_sharing: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frequently">Frequently</SelectItem>
                      <SelectItem value="sometimes">Sometimes</SelectItem>
                      <SelectItem value="rarely">Rarely</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => setShowQuestionnaireEditor(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateQuestionnaire} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Withdrawal Dialog */}
    <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Withdraw Earnings
          </DialogTitle>
          <DialogDescription>
            Convert your data coins to NZD and withdraw to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Balance and Conversion Rate */}
          <div className="space-y-2">
            <Card className="bg-muted/50 border-border">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="text-lg font-bold text-foreground">{totalEarnings} coins</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Conversion Rate</span>
                    <span className="text-sm font-semibold text-primary">1 coin = 1 NZD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (coins)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
              max={totalEarnings}
              min="1"
            />
            {withdrawalAmount && (
              <p className="text-sm text-muted-foreground">
                You will receive: <span className="font-semibold text-primary">{withdrawalAmount} NZD</span>
              </p>
            )}
          </div>

          {/* Personal Details */}
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={withdrawalDetails.fullName}
                onChange={(e) => setWithdrawalDetails({ ...withdrawalDetails, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account Number</Label>
              <Input
                id="bankAccount"
                placeholder="00-0000-0000000-00"
                value={withdrawalDetails.bankAccount}
                onChange={(e) => setWithdrawalDetails({ ...withdrawalDetails, bankAccount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={withdrawalDetails.email}
                onChange={(e) => setWithdrawalDetails({ ...withdrawalDetails, email: e.target.value })}
              />
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              ℹ️ This is a demo withdrawal. No actual transaction will be processed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWithdrawalDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleWithdrawal}>
            Submit Withdrawal Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Dashboard;
