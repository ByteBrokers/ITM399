import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Questionnaire from "@/components/game/Questionnaire";
import CharacterCustomization from "@/components/game/CharacterCustomization";
import Game3D from "@/components/game/Game3D";
import type { QuestionnaireData, CharacterCustomizationData, GameStateData } from "@/types/game";

type GamePhase = "questionnaire" | "character" | "game";

const Game = () => {
  const [phase, setPhase] = useState<GamePhase>("questionnaire");
  const [userId, setUserId] = useState<string | null>(null);
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [characterData, setCharacterData] = useState<CharacterCustomizationData | null>(null);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await loadExistingData(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const loadExistingData = async (uid: string) => {
    try {
      const [qResponse, cResponse, gResponse] = await Promise.all([
        supabase.from("questionnaire_responses").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("character_customization").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("game_state").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      if (qResponse.data) {
        setQuestionnaireData(qResponse.data);
        setPhase("character");
      }
      if (cResponse.data) {
        setCharacterData(cResponse.data);
        setPhase("game");
      }
      if (gResponse.data) {
        setGameState({
          coins: gResponse.data.coins,
          level: gResponse.data.level,
          exp: gResponse.data.exp,
          data_types: gResponse.data.data_types as Record<string, any>,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleQuestionnaireComplete = async (data: QuestionnaireData) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("questionnaire_responses").upsert({
        user_id: userId,
        ...data,
      });
      if (error) throw error;
      setQuestionnaireData(data);
      setPhase("character");
    } catch (error: any) {
      toast.error("Failed to save questionnaire data");
      console.error(error);
    }
  };

  const handleCharacterComplete = async (data: CharacterCustomizationData) => {
    if (!userId || !questionnaireData) return;
    try {
      const { error: charError } = await supabase.from("character_customization").upsert({
        user_id: userId,
        ...data,
      });
      if (charError) throw charError;

      const dataTypes = generateDataTypes(questionnaireData);
      const coins = Object.keys(dataTypes).length * 20 + 60;

      const { error: gameError } = await supabase.from("game_state").upsert({
        user_id: userId,
        coins,
        level: 1,
        exp: 0,
        data_types: dataTypes,
      });
      if (gameError) throw gameError;

      setCharacterData(data);
      setGameState({ coins, level: 1, exp: 0, data_types: dataTypes });
      setPhase("game");
    } catch (error: any) {
      toast.error("Failed to save character data");
      console.error(error);
    }
  };

  const generateDataTypes = (data: QuestionnaireData) => {
    const types: any = {};

    if (data.location) {
      types['Location Data'] = { 
        value: 60 + (data.devices?.includes('smartphone') ? 30 : 0), 
        owned: true 
      };
    }

    if (data.social_media && data.social_media.length > 0) {
      types['Social Media'] = { 
        value: 50 + (data.social_media.length * 15), 
        owned: true 
      };
    }

    if (data.shopping_freq && data.shopping_freq !== 'rarely') {
      types['Shopping Habits'] = { 
        value: 70 + ((data.shopping_categories?.length || 0) * 10), 
        owned: true 
      };
    }

    if (data.screen_time) {
      const timeValue = data.screen_time === '10+' ? 100 : 
                       data.screen_time === '7-9' ? 80 : 
                       data.screen_time === '4-6' ? 60 : 40;
      types['Digital Habits'] = { value: timeValue, owned: true };
    }

    if (data.devices && data.devices.length > 0) {
      types['Device Usage'] = { 
        value: 45 + (data.devices.length * 15), 
        owned: true 
      };
    }

    if (data.fitness === 'yes-regularly') {
      types['Health Data'] = { value: 120, owned: true };
    } else if (data.fitness === 'yes-occasionally') {
      types['Fitness Data'] = { value: 80, owned: true };
    }

    if (data.privacy_concern) {
      const privacyValue = data.privacy_concern === 'very-concerned' ? 40 : 
                          data.privacy_concern === 'somewhat-concerned' ? 60 : 
                          data.privacy_concern === 'not-very-concerned' ? 80 : 100;
      types['Privacy Preferences'] = { value: privacyValue, owned: true };
    }

    if (data.interests) {
      types['Interests'] = { value: 55, owned: true };
    }

    return types;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  if (!userId) {
    return <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
      <p className="text-white">Loading...</p>
    </div>;
  }

  return (
    <>
      {phase === "questionnaire" && (
        <Questionnaire onComplete={handleQuestionnaireComplete} />
      )}
      {phase === "character" && questionnaireData && (
        <CharacterCustomization onComplete={handleCharacterComplete} />
      )}
      {phase === "game" && characterData && gameState && userId && (
        <Game3D 
          characterData={characterData}
          initialGameState={gameState}
          userId={userId}
          onLogout={handleLogout}
          onGoHome={handleGoHome}
        />
      )}
    </>
  );
};

export default Game;
