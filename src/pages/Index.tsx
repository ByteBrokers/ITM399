import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, TrendingUp } from "lucide-react";
import logoImage from '@/assets/bytebrokerslogo1.png';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/20 relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {/* Logo and Header */}
        <div className="text-center mb-12 space-y-4">
          <img 
            src={logoImage} 
            alt="ByteBrokers Logo" 
            className="w-48 h-auto mx-auto mb-6 opacity-90"
          />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to ByteBrokers
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your personal data marketplace. Choose your path below.
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {/* Seller Card */}
        <Card className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer group backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sell Your Data</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the game, collect your data, and sell it to companies for coins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Play an immersive 3D game
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Collect and manage your personal data
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Sell to different companies for profit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Track earnings and withdraw funds
              </li>
            </ul>
            <Button 
              onClick={() => navigate("/game")} 
              className="w-full mt-4"
              size="lg"
            >
              Start Selling
            </Button>
          </CardContent>
        </Card>

        {/* Buyer Card */}
        <Card className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer group backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ShoppingCart className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Buy Data</CardTitle>
            <CardDescription className="text-base mt-2">
              Browse and purchase valuable user data for your business needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Access real user data insights
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Filter by data category and recency
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                View pricing and availability
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                Make informed purchasing decisions
              </li>
            </ul>
            <Button 
              onClick={() => navigate("/buyer")} 
              className="w-full mt-4"
              size="lg"
              variant="outline"
            >
              Browse Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-sm text-muted-foreground mt-12 text-center max-w-2xl mx-auto">
        ByteBrokers connects data sellers and buyers in a transparent marketplace. 
        Your privacy and security are our top priorities.
      </p>
      </div>
    </div>
  );
};

export default Index;
