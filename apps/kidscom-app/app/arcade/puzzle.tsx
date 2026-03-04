/**
 * Puzzle Time - Sliding Puzzle Game
 * Arrange the tiles in order!
 */

import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

type PuzzleSize = 3 | 4;
type Tile = number | null;

const PUZZLE_EMOJIS = {
  3: ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"],
  4: [
    "1️⃣", "2️⃣", "3️⃣", "4️⃣",
    "5️⃣", "6️⃣", "7️⃣", "8️⃣",
    "9️⃣", "🔟", "⬛", "⬜",
    "🔴", "🟡", "🟢",
  ],
};

export default function PuzzleGameScreen() {
  const [puzzleSize, setPuzzleSize] = useState<PuzzleSize | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [bestTime, setBestTime] = useState<{ [key: number]: number }>({
    3: Infinity,
    4: Infinity,
  });

  // Timer
  useEffect(() => {
    if (!startTime || isSolved) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isSolved]);

  // Check if solved
  const checkSolved = useCallback((currentTiles: Tile[]): boolean => {
    for (let i = 0; i < currentTiles.length - 1; i++) {
      if (currentTiles[i] !== i + 1) return false;
    }
    return currentTiles[currentTiles.length - 1] === null;
  }, []);

  // Shuffle tiles
  const shuffleTiles = useCallback((size: PuzzleSize): Tile[] => {
    const total = size * size;
    const tiles: Tile[] = Array.from({ length: total - 1 }, (_, i) => i + 1);
    tiles.push(null);

    // Fisher-Yates shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    // Ensure puzzle is solvable
    if (!isSolvable(tiles, size)) {
      // Swap first two non-null tiles to make it solvable
      const idx1 = tiles.findIndex((t) => t !== null);
      const idx2 = tiles.findIndex((t, i) => i !== idx1 && t !== null);
      [tiles[idx1], tiles[idx2]] = [tiles[idx2], tiles[idx1]];
    }

    return tiles;
  }, []);

  // Check if puzzle is solvable
  const isSolvable = (tiles: Tile[], size: number): boolean => {
    let inversions = 0;
    const flatTiles = tiles.filter((t) => t !== null) as number[];

    for (let i = 0; i < flatTiles.length - 1; i++) {
      for (let j = i + 1; j < flatTiles.length; j++) {
        if (flatTiles[i] > flatTiles[j]) inversions++;
      }
    }

    if (size % 2 === 1) {
      // Odd size: solvable if inversions are even
      return inversions % 2 === 0;
    } else {
      // Even size: more complex rule
      const emptyRowFromBottom = size - Math.floor(tiles.indexOf(null) / size);
      if (emptyRowFromBottom % 2 === 1) {
        return inversions % 2 === 0;
      } else {
        return inversions % 2 === 1;
      }
    }
  };

  // Initialize game
  const startGame = (size: PuzzleSize) => {
    setPuzzleSize(size);
    setTiles(shuffleTiles(size));
    setMoves(0);
    setIsSolved(false);
    setStartTime(new Date());
    setElapsedTime(0);
  };

  // Handle tile press
  const handleTilePress = (index: number) => {
    if (isSolved || !puzzleSize) return;
    if (tiles[index] === null) return;

    const emptyIndex = tiles.indexOf(null);
    const row = Math.floor(index / puzzleSize);
    const emptyRow = Math.floor(emptyIndex / puzzleSize);
    const col = index % puzzleSize;
    const emptyCol = emptyIndex % puzzleSize;

    // Check if adjacent to empty
    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (!isAdjacent) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Swap tiles
    const newTiles = [...tiles];
    [newTiles[index], newTiles[emptyIndex]] = [
      newTiles[emptyIndex],
      newTiles[index],
    ];
    setTiles(newTiles);
    setMoves((m) => m + 1);

    // Check if solved
    if (checkSolved(newTiles)) {
      setIsSolved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update best time
      if (elapsedTime < bestTime[puzzleSize]) {
        setBestTime((prev) => ({ ...prev, [puzzleSize]: elapsedTime }));
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === Infinity) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % puzzleSize;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStars = (): number => {
    if (!puzzleSize) return 0;
    const minMoves = puzzleSize === 3 ? 20 : 50;
    const ratio = minMoves / moves;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    return 1;
  };

  // Size selection screen
  if (!puzzleSize) {
    return (
      <LinearGradient colors={["#84cc16", "#a3e635", "#bef264"]} style={{ flex: 1 }}>
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
            <Text className="text-6xl mb-4">🧩</Text>
            <Text className="text-4xl font-bold text-white mb-2">
              Puzzle Time
            </Text>
            <Text className="text-lime-200 text-lg text-center mb-8">
              Slide tiles to arrange them in order!
            </Text>

            <View className="w-full space-y-4">
              <TouchableOpacity
                className="bg-white py-5 rounded-2xl"
                onPress={() => startGame(3)}
              >
                <Text className="text-lime-600 font-bold text-xl text-center">
                  3×3 Puzzle
                </Text>
                <Text className="text-lime-400 text-center mt-1">
                  Best: {formatTime(bestTime[3])}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/80 py-5 rounded-2xl"
                onPress={() => startGame(4)}
              >
                <Text className="text-lime-600 font-bold text-xl text-center">
                  4×4 Puzzle
                </Text>
                <Text className="text-lime-400 text-center mt-1">
                  Best: {formatTime(bestTime[4])}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Solved screen
  if (isSolved) {
    const stars = getStars();
    return (
      <LinearGradient colors={["#84cc16", "#a3e635", "#bef264"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full">
            <Text className="text-6xl mb-4">🎉</Text>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Puzzle Complete!
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
                <Text className="text-3xl font-bold text-lime-600">{moves}</Text>
                <Text className="text-gray-500">Moves</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-lime-600">
                  {formatTime(elapsedTime)}
                </Text>
                <Text className="text-gray-500">Time</Text>
              </View>
            </View>

            {elapsedTime <= bestTime[puzzleSize] && (
              <View className="bg-yellow-100 px-4 py-2 rounded-full mb-4">
                <Text className="text-yellow-600 font-bold">
                  🏆 New Best Time!
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="w-full space-y-3 mt-4">
              <TouchableOpacity
                className="bg-lime-500 py-4 rounded-2xl"
                onPress={() => startGame(puzzleSize)}
              >
                <Text className="text-white font-bold text-lg text-center">
                  Play Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-100 py-4 rounded-2xl"
                onPress={() => setPuzzleSize(null)}
              >
                <Text className="text-gray-600 font-bold text-lg text-center">
                  Change Size
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
  const boardSize = width - 48;
  const tileSize = (boardSize - (puzzleSize - 1) * 4) / puzzleSize;

  return (
    <LinearGradient colors={["#84cc16", "#a3e635", "#bef264"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={() => setPuzzleSize(null)}
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
            onPress={() => startGame(puzzleSize)}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Goal Preview */}
        <View className="items-center my-4">
          <Text className="text-white font-bold mb-2">Goal:</Text>
          <View className="flex-row">
            {Array.from({ length: puzzleSize }, (_, i) => (
              <View
                key={i}
                className="bg-white/30 rounded-lg mx-0.5 items-center justify-center"
                style={{ width: 24, height: 24 }}
              >
                <Text className="text-xs font-bold text-white">{i + 1}</Text>
              </View>
            ))}
            <View
              className="bg-white/10 rounded-lg mx-0.5 items-center justify-center"
              style={{ width: 24, height: 24 }}
            />
          </View>
        </View>

        {/* Puzzle Board */}
        <View className="flex-1 items-center justify-center">
          <View
            className="bg-white/20 rounded-3xl p-2"
            style={{ width: boardSize + 16, height: boardSize + 16 }}
          >
            <View className="flex-row flex-wrap">
              {tiles.map((tile, index) => (
                <TouchableOpacity
                  key={index}
                  className={`items-center justify-center ${
                    tile === null ? "bg-transparent" : "bg-white"
                  }`}
                  style={{
                    width: tileSize,
                    height: tileSize,
                    borderRadius: 12,
                    margin: 2,
                    shadowColor: tile ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: tile ? 0.1 : 0,
                    shadowRadius: 4,
                    elevation: tile ? 3 : 0,
                  }}
                  onPress={() => handleTilePress(index)}
                  activeOpacity={tile ? 0.8 : 1}
                >
                  {tile !== null && (
                    <Text
                      className="font-bold text-lime-600"
                      style={{ fontSize: tileSize * 0.4 }}
                    >
                      {tile}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Hint */}
        <View className="items-center pb-8">
          <Text className="text-white/80 text-center">
            Tap a tile next to the empty space to move it
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
