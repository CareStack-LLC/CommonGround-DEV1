/**
 * Arcade Screen for Kidscom App
 * Hub for all mini-games
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface Game {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string[];
  type: "single" | "multiplayer";
  route?: string;
  comingSoon?: boolean;
}

const GAMES: Game[] = [
  {
    id: "memory",
    title: "Memory Match",
    emoji: "🧠",
    description: "Find the pairs!",
    color: ["#8b5cf6", "#a78bfa"],
    type: "single",
    route: "/arcade/memory",
  },
  {
    id: "quiz",
    title: "Fun Quiz",
    emoji: "❓",
    description: "Test your brain!",
    color: ["#f97316", "#fb923c"],
    type: "single",
    route: "/arcade/quiz",
  },
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    emoji: "⭕",
    description: "Play X's and O's!",
    color: ["#ec4899", "#f472b6"],
    type: "multiplayer",
    route: "/arcade/tic-tac-toe",
  },
  {
    id: "puzzle",
    title: "Puzzle Time",
    emoji: "🧩",
    description: "Solve puzzles!",
    color: ["#84cc16", "#a3e635"],
    type: "single",
    route: "/arcade/puzzle",
  },
  {
    id: "drawing",
    title: "Draw Together",
    emoji: "🎨",
    description: "Draw with family!",
    color: ["#06b6d4", "#22d3ee"],
    type: "multiplayer",
    comingSoon: true,
  },
  {
    id: "story",
    title: "Story Builder",
    emoji: "📖",
    description: "Create stories!",
    color: ["#eab308", "#facc15"],
    type: "multiplayer",
    comingSoon: true,
  },
];

export default function ArcadeScreen() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);

  const handleGamePress = (game: Game) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (game.comingSoon) {
      setSelectedGame(game);
      setShowGameModal(true);
    } else if (game.route) {
      router.push(game.route);
    }
  };

  const handlePlayGame = (withFamily: boolean) => {
    if (!selectedGame) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGameModal(false);

    if (selectedGame.route) {
      router.push({
        pathname: selectedGame.route,
        params: withFamily ? { multiplayer: "true" } : undefined,
      });
    }
  };

  return (
    <LinearGradient
      colors={["#06b6d4", "#22d3ee", "#67e8f9"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-4xl font-bold text-white text-center">
            Arcade 🎮
          </Text>
          <Text className="text-lg text-cyan-200 text-center mt-1">
            Fun games to play!
          </Text>
        </View>

        {/* Games Grid */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {GAMES.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onPress={() => handleGamePress(game)}
              />
            ))}
          </View>

          {/* Coming Soon Section */}
          <View className="mt-6 bg-white/20 rounded-3xl p-6">
            <Text className="text-2xl font-bold text-white text-center mb-2">
              More Games Coming! 🚀
            </Text>
            <Text className="text-cyan-200 text-center">
              New games are added every week!
            </Text>
          </View>
        </ScrollView>

        {/* Coming Soon Modal */}
        <Modal
          visible={showGameModal && selectedGame?.comingSoon}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGameModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6">
              {selectedGame && (
                <>
                  <View className="items-center mb-6">
                    <LinearGradient
                      colors={selectedGame.color}
                      style={{ width: 96, height: 96, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 }}
                    >
                      <Text className="text-5xl">{selectedGame.emoji}</Text>
                    </LinearGradient>
                    <Text className="text-2xl font-bold text-gray-800">
                      {selectedGame.title}
                    </Text>
                    <View className="flex-row items-center mt-2 bg-yellow-100 px-4 py-2 rounded-full">
                      <Ionicons name="time" size={18} color="#eab308" />
                      <Text className="text-yellow-600 ml-2 font-bold">
                        Coming Soon!
                      </Text>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-center mb-6">
                    This game is still being built. Check back soon!
                  </Text>

                  <TouchableOpacity
                    className="bg-gray-100 py-4 rounded-2xl items-center"
                    onPress={() => setShowGameModal(false)}
                  >
                    <Text className="text-gray-600 font-bold text-lg">
                      Got it!
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function GameCard({ game, onPress }: { game: Game; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="w-[48%] mb-4"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={game.color}
        style={{ borderRadius: 24, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Coming Soon Badge */}
        {game.comingSoon && (
          <View className="absolute top-2 left-2 bg-yellow-400 px-2 py-1 rounded-full">
            <Text className="text-yellow-900 text-xs font-bold">Soon</Text>
          </View>
        )}

        {/* Multiplayer Badge */}
        {game.type === "multiplayer" && !game.comingSoon && (
          <View className="absolute top-2 right-2 bg-white/30 px-2 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">👥</Text>
          </View>
        )}

        {/* Emoji */}
        <View
          className={`w-16 h-16 bg-white/30 rounded-2xl items-center justify-center mb-3 ${
            game.comingSoon ? "opacity-60" : ""
          }`}
        >
          <Text className="text-4xl">{game.emoji}</Text>
        </View>

        {/* Title */}
        <Text
          className={`text-lg font-bold text-white text-center ${
            game.comingSoon ? "opacity-60" : ""
          }`}
        >
          {game.title}
        </Text>

        {/* Description */}
        <Text
          className={`text-white/80 text-sm text-center ${
            game.comingSoon ? "opacity-60" : ""
          }`}
        >
          {game.description}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
