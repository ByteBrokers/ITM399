import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionnaireData } from "@/types/game";

interface QuestionnaireProps {
  onComplete: (data: QuestionnaireData) => void;
}

const Questionnaire = ({ onComplete }: QuestionnaireProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<QuestionnaireData>({
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

  const totalPages = 4;
  const progress = (currentPage / totalPages) * 100;

  const handleCheckboxChange = (field: keyof QuestionnaireData, value: string, checked: boolean) => {
    const currentValues = (formData[field] as string[]) || [];
    setFormData({
      ...formData,
      [field]: checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value),
    });
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSubmit = () => {
    onComplete(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/20 relative overflow-hidden flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl bg-card/95 backdrop-blur-sm rounded-xl shadow-xl border border-border p-8">
        <div className="w-full h-2 bg-muted rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {currentPage === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">📋 Welcome to the Data Marketplace!</h2>
              <p className="text-muted-foreground">
                Let's collect some basic information about you. This data will determine your starting
                inventory in the virtual world.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">What's your name?</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <Label htmlFor="age">Age Range:</Label>
                <Select value={formData.age} onValueChange={(value) => setFormData({ ...formData, age: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age range" />
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
                <Label htmlFor="location">Location (City/Country):</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., New York, USA"
                />
              </div>

              <div>
                <Label htmlFor="occupation">Occupation:</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="What do you do for work?"
                />
              </div>
            </div>

            <Button onClick={nextPage} className="w-full bg-gradient-primary">
              Next →
            </Button>
          </div>
        )}

        {currentPage === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">💻 Digital Life & Habits</h2>

            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Which devices do you use regularly?</Label>
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
                        id={device.value}
                        checked={formData.devices?.includes(device.value)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange("devices", device.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={device.value} className="cursor-pointer">
                        {device.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Which social media platforms do you use?</Label>
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
                        id={platform.value}
                        checked={formData.social_media?.includes(platform.value)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange("social_media", platform.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={platform.value} className="cursor-pointer">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="screenTime">How many hours per day do you spend online?</Label>
                <Select
                  value={formData.screen_time}
                  onValueChange={(value) => setFormData({ ...formData, screen_time: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3">1-3 hours</SelectItem>
                    <SelectItem value="4-6">4-6 hours</SelectItem>
                    <SelectItem value="7-9">7-9 hours</SelectItem>
                    <SelectItem value="10+">10+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={prevPage} variant="outline" className="flex-1">
                ← Previous
              </Button>
              <Button onClick={nextPage} className="flex-1 bg-gradient-primary">
                Next →
              </Button>
            </div>
          </div>
        )}

        {currentPage === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">🛒 Shopping & Health</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="shoppingFreq">How often do you shop online?</Label>
                <Select
                  value={formData.shopping_freq}
                  onValueChange={(value) => setFormData({ ...formData, shopping_freq: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
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
                <Label className="mb-3 block">What do you typically buy online?</Label>
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
                        id={category.value}
                        checked={formData.shopping_categories?.includes(category.value)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange("shopping_categories", category.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={category.value} className="cursor-pointer">
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="fitness">Do you use fitness tracking apps or devices?</Label>
                <Select
                  value={formData.fitness}
                  onValueChange={(value) => setFormData({ ...formData, fitness: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes-regularly">Yes, regularly</SelectItem>
                    <SelectItem value="yes-occasionally">Yes, occasionally</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interests">What are your main interests/hobbies?</Label>
                <Textarea
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="e.g., photography, cooking, gaming, sports..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={prevPage} variant="outline" className="flex-1">
                ← Previous
              </Button>
              <Button onClick={nextPage} className="flex-1 bg-gradient-primary">
                Next →
              </Button>
            </div>
          </div>
        )}

        {currentPage === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">🔒 Privacy & Data Sharing</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="privacyConcern">How concerned are you about online privacy?</Label>
                <Select
                  value={formData.privacy_concern}
                  onValueChange={(value) => setFormData({ ...formData, privacy_concern: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
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
                <Label htmlFor="dataSharing">
                  Have you ever consciously shared personal data for benefits (discounts, personalization,
                  etc.)?
                </Label>
                <Select
                  value={formData.data_sharing}
                  onValueChange={(value) => setFormData({ ...formData, data_sharing: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequently">Frequently</SelectItem>
                    <SelectItem value="sometimes">Sometimes</SelectItem>
                    <SelectItem value="rarely">Rarely</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-primary/10 p-6 rounded-lg">
                <h3 className="font-bold mb-2">🎮 Ready to Enter the Data Marketplace!</h3>
                <p className="text-sm text-muted-foreground">
                  Your responses will determine your starting data inventory and its value. In this game,
                  you'll learn about data economics by selling your virtual data to different companies!
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={prevPage} variant="outline" className="flex-1">
                ← Previous
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-gradient-primary">
                Customize Character →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Questionnaire;
