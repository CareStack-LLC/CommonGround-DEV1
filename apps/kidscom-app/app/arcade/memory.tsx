/**
 * Memory Match Game
 * Find matching pairs of cards!
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 64) / 4;

// Emoji pairs for the game
const EMOJI_SETS = {
  animals: ["🐶", "🐱", "🐼", "🐨", "🦁", "🐸", "🐰", "🦊"],
  food: ["🍕", "🍦", "🍩", "🍪", "🍬", "🍓", "🍎", "🍉"],
  nature: ["🌸", "🌻", "🌈", "⭐", "🌙", "☀️", "🍀", "🌺"],
  transport: ["🚗", "✈️", "🚀", "🚂", "🚁", "⛵", "🚲", "🛸"],
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_CONFIG = {
  easy: { pairs: 4, columns: 2 },
  medium: { pairs: 6, columns: 3 },
  hard: { pairs: 8, columns: 4 },
};

export default function MemoryGameScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer
  useEffect(() => {
    if (!startTime || gameComplete) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, gameComplete]);

  // Initialize game
  const initializeGame = useCallback((diff: Difficulty) => {
    const config = DIFFICULTY_CONFIG[diff];
    const emojiSet = EMOJI_SETS.animals.slice(0, config.pairs);

    // Create pairs
    const cardEmojis = [...emojiSet, ...emojiSet];

    // Shuffle
    const shuffled = cardEmojis
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffled);
    setMoves(0);
    setMatches(0);
    setSelectedCards([]);
    setGameComplete(false);
    setStartTime(new Date());
    setElapsedTime(0);
    setDifficulty(diff);
  }, []);

  // Handle card press
  const handleCardPress = (cardId: number) => {
    if (isLocked) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Flip the card
    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newSelected = [...selectedCards, cardId];
    setSelectedCards(newSelected);

    // Check for match when 2 cards selected
    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      setIsLocked(true);

      const [first, second] = newSelected;
      const firstCard = newCards.find((c) => c.id === first);
      const secondCard = newCards.find((c) => c.id === second);

      if (firstCard?.emoji === secondCard?.emoji) {
        // Match!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const matchedCards = newCards.map((c) =>
          c.id === first || c.id === second ? { ...c, isMatched: true } : c
        );
        setCards(matchedCards);
        setMatches((m) => m + 1);
        setSelectedCards([]);
        setIsLocked(false);

        // Check win condition
        const config = DIFFICULTY_CONFIG[difficulty!];
        if (matches + 1 === config.pairs) {
          setGameComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        // No match - flip back
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
          setCards(
            newCards.map((c) =>
              c.id === first || c.id === second ? { ...c, isFlipped: false } : c
            )
          );
          setSelectedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStars = (): number => {
    if (!difficulty) return 0;
    const config = DIFFICULTY_CONFIG[difficulty];
    const perfectMoves = config.pairs;
    const ratio = perfectMoves / moves;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  };

  // Difficulty selection screen
  if (!difficulty) {
    return (
      <LinearGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View className="flex-row items-center px-4 py-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-6xl mb-4">🧠</Text>
            <Text className="text-4xl font-bold text-white mb-2">
              Memory Match
            </Text>
            <Text className="text-purple-200 text-lg text-center mb-8">
              Find the matching pairs!
            </Text>

            <View className="w-full space-y-4">
              <TouchableOpacity
                className="bg-white py-4 rounded-2xl"
                onPress={() => initializeGame("easy")}
              >
                <Text className="text-purple-600 font-bold text-lg text-center">
                  🌟 Easy (4 pairs)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/80 py-4 rounded-2xl"
                onPress={() => initializeGame("medium")}
              >
                <Text className="text-purple-600 font-bold text-lg text-center">
                  🌟🌟 Medium (6 pairs)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/60 py-4 rounded-2xl"
                onPress={() => initializeGame("hard")}
              >
                <Text className="text-purple-600 font-bold text-lg text-center">
                  🌟🌟🌟 Hard (8 pairs)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Game complete screen
  if (gameComplete) {
    const stars = getStars();
    return (
      <LinearGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full">
            <Text className="text-6xl mb-4">🎉</Text>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              You Win!
            </Text>

            {/* Stars */}
            <View className="flex-row my-4">
              {[1, 2, 3].map((star) => (
                <Text
                  key={star}
                  className="text-4xl mx-1"
                  style={{ opacity: star <= stars ? 1 : 0.3 }}
                >
                  ⭐
                </Text>
              ))}
            </View>

            {/* Stats */}
            <View className="flex-row justify-around w-full my-4">
              <View className="items-center">
                <Text className="text-3xl font-bold text-purple-600">
                  {moves}
                </Text>
                <Text className="text-gray-500">Moves</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-purple-600">
                  {formatTime(elapsedTime)}
                </Text>
                <Text className="text-gray-500">Time</Text>
              </View>
            </View>

            {/* Actions */}
            <View className="w-full space-y-3 mt-4">
              <TouchableOpacity
                className="bg-purple-500 py-4 rounded-2xl"
                onPress={() => initializeGame(difficulty)}
              >
                <Text className="text-white font-bold text-lg text-center">
                  Play Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-100 py-4 rounded-2xl"
                onPress={() => setDifficulty(null)}
              >
                <Text className="text-gray-600 font-bold text-lg text-center">
                  Change Difficulty
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-4 rounded-2xl"
                onPress={() => router.back()}
              >
                <Text className="text-gray-400 font-bold text-lg text-center">
                  Back to Arcade
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Game screen
  const config = DIFFICULTY_CONFIG[difficulty];
  const cardWidth = (width - 48 - (config.columns - 1) * 8) / config.columns;

  return (
    <LinearGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-row items-center space-x-4">
            <View className="bg-white/20 px-4 py-2 rounded-full flex-row items-center">
              <Ionicons name="swap-horizontal" size={18} color="white" />
              <Text className="text-white font-bold ml-2">{moves}</Text>
            </View>
            <View className="bg-white/20 px-4 py-2 rounded-full flex-row items-center">
              <Ionicons name="time" size={18} color="white" />
              <Text className="text-white font-bold ml-2">
                {formatTime(elapsedTime)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => initializeGame(difficulty)}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View className="px-4 my-2">
          <View className="bg-white/30 h-3 rounded-full overflow-hidden">
            <View
              className="bg-white h-full rounded-full"
              style={{ width: `${(matches / config.pairs) * 100}%` }}
            />
          </View>
          <Text className="text-white text-center mt-1">
            {matches} / {config.pairs} pairs found
          </Text>
        </View>

        {/* Card Grid */}
        <View className="flex-1 items-center justify-center px-4">
          <View
            className="flex-row flex-wrap justify-center"
            style={{ width: cardWidth * config.columns + (config.columns - 1) * 8 }}
          >
            {cards.map((card) => (
              <MemoryCard
                key={card.id}
                card={card}
                size={cardWidth}
                onPress={() => handleCardPress(card.id)}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function MemoryCard({
  card,
  size,
  onPress,
}: {
  card: Card;
  size: number;
  onPress: () => void;
}) {
  const isRevealed = card.isFlipped || card.isMatched;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isRevealed}
      style={{ width: size, height: size * 1.2, margin: 4 }}
      activeOpacity={0.8}
    >
      <View
        className={`flex-1 rounded-2xl items-center justify-center ${
          card.isMatched
            ? "bg-green-400"
            : isRevealed
            ? "bg-white"
            : "bg-white/40"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {isRevealed ? (
          <Text style={{ fontSize: size * 0.5 }}>{card.emoji}</Text>
        ) : (
          <Text style={{ fontSize: size * 0.3 }}>❓</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
