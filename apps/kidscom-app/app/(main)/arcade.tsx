import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

interface Game {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string[];
  type: "single" | "multiplayer";
}

const GAMES: Game[] = [
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    emoji: "⭕",
    description: "Play X's and O's!",
    color: ["#ec4899", "#f472b6"],
    type: "multiplayer",
  },
  {
    id: "memory",
    title: "Memory Match",
    emoji: "🧠",
    description: "Find the pairs!",
    color: ["#8b5cf6", "#a78bfa"],
    type: "single",
  },
  {
    id: "drawing",
    title: "Draw Together",
    emoji: "🎨",
    description: "Draw with family!",
    color: ["#06b6d4", "#22d3ee"],
    type: "multiplayer",
  },
  {
    id: "quiz",
    title: "Fun Quiz",
    emoji: "❓",
    description: "Test your brain!",
    color: ["#f97316", "#fb923c"],
    type: "single",
  },
  {
    id: "puzzle",
    title: "Puzzle Time",
    emoji: "🧩",
    description: "Solve puzzles!",
    color: ["#84cc16", "#a3e635"],
    type: "single",
  },
  {
    id: "story",
    title: "Story Builder",
    emoji: "📖",
    description: "Create stories!",
    color: ["#eab308", "#facc15"],
    type: "multiplayer",
  },
];

export default function ArcadeScreen() {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);

  const handleGamePress = (game: Game) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedGame(game);
    setShowGameModal(true);
  };

  const handlePlayGame = (withFamily: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowGameModal(false);
    // In real app, this would launch the game
    alert(`Starting ${selectedGame?.title} ${withFamily ? "with family" : "alone"}!`);
  };

  return (
    <LinearGradient
      colors={["#06b6d4", "#22d3ee", "#67e8f9"]}
      className="flex-1"
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

        {/* Game Launch Modal */}
        <Modal
          visible={showGameModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGameModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6">
              {selectedGame && (
                <>
                  {/* Game Info */}
                  <View className="items-center mb-6">
                    <LinearGradient
                      colors={selectedGame.color}
                      className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
                    >
                      <Text className="text-5xl">{selectedGame.emoji}</Text>
                    </LinearGradient>
                    <Text className="text-2xl font-bold text-gray-800">
                      {selectedGame.title}
                    </Text>
                    <Text className="text-gray-500">
                      {selectedGame.description}
                    </Text>
                    {selectedGame.type === "multiplayer" && (
                      <View className="flex-row items-center mt-2 bg-purple-100 px-3 py-1 rounded-full">
                        <Ionicons name="people" size={16} color="#8b5cf6" />
                        <Text className="text-purple-600 ml-1 font-medium">
                          Multiplayer
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View className="space-y-3">
                    <TouchableOpacity
                      className="bg-cyan-500 py-4 rounded-2xl items-center"
                      onPress={() => handlePlayGame(false)}
                    >
                      <Text className="text-white font-bold text-lg">
                        ▶ Play Now
                      </Text>
                    </TouchableOpacity>

                    {selectedGame.type === "multiplayer" && (
                      <TouchableOpacity
                        className="bg-purple-500 py-4 rounded-2xl items-center"
                        onPress={() => handlePlayGame(true)}
                      >
                        <Text className="text-white font-bold text-lg">
                          👥 Play with Family
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      className="bg-gray-100 py-4 rounded-2xl items-center"
                      onPress={() => setShowGameModal(false)}
                    >
                      <Text className="text-gray-600 font-bold text-lg">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
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
        className="rounded-3xl p-4 items-center shadow-lg"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Emoji */}
        <View className="w-16 h-16 bg-white/30 rounded-2xl items-center justify-center mb-3">
          <Text className="text-4xl">{game.emoji}</Text>
        </View>

        {/* Title */}
        <Text className="text-lg font-bold text-white text-center">
          {game.title}
        </Text>

        {/* Description */}
        <Text className="text-white/80 text-sm text-center">
          {game.description}
        </Text>

        {/* Multiplayer Badge */}
        {game.type === "multiplayer" && (
          <View className="absolute top-2 right-2 bg-white/30 px-2 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">👥</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
