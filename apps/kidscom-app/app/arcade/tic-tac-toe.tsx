/**
 * Tic Tac Toe Game
 * Classic X's and O's game - play against AI or a friend!
 */

import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const BOARD_SIZE = width - 48;
const CELL_SIZE = BOARD_SIZE / 3;

type Player = "X" | "O" | null;
type Board = Player[];
type GameMode = "ai" | "friend" | null;
type Difficulty = "easy" | "medium" | "hard";

const WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6], // Anti-diagonal
];

export default function TicTacToeScreen() {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [isAIThinking, setIsAIThinking] = useState(false);

  // Check for winner
  const checkWinner = useCallback((board: Board): Player | "draw" | null => {
    for (const [a, b, c] of WINNING_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinningLine([a, b, c]);
        return board[a];
      }
    }
    if (board.every((cell) => cell !== null)) {
      return "draw";
    }
    return null;
  }, []);

  // AI move
  const makeAIMove = useCallback(
    (currentBoard: Board) => {
      setIsAIThinking(true);

      setTimeout(() => {
        const emptyCells = currentBoard
          .map((cell, index) => (cell === null ? index : null))
          .filter((index) => index !== null) as number[];

        if (emptyCells.length === 0) {
          setIsAIThinking(false);
          return;
        }

        let moveIndex: number;

        if (difficulty === "easy") {
          // Random move
          moveIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        } else if (difficulty === "medium") {
          // 70% smart, 30% random
          if (Math.random() < 0.7) {
            moveIndex = getBestMove(currentBoard, "O");
          } else {
            moveIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
          }
        } else {
          // Always best move
          moveIndex = getBestMove(currentBoard, "O");
        }

        const newBoard = [...currentBoard];
        newBoard[moveIndex] = "O";
        setBoard(newBoard);

        const result = checkWinner(newBoard);
        if (result) {
          setWinner(result);
          Haptics.notificationAsync(
            result === "O"
              ? Haptics.NotificationFeedbackType.Error
              : Haptics.NotificationFeedbackType.Success
          );
          if (result !== "draw") {
            setScores((s) => ({ ...s, [result]: s[result] + 1 }));
          } else {
            setScores((s) => ({ ...s, draws: s.draws + 1 }));
          }
        } else {
          setCurrentPlayer("X");
        }

        setIsAIThinking(false);
      }, 500);
    },
    [difficulty, checkWinner]
  );

  // Minimax algorithm for AI
  const getBestMove = (board: Board, player: "X" | "O"): number => {
    // Check for winning move
    for (const [a, b, c] of WINNING_LINES) {
      if (
        board[a] === player &&
        board[b] === player &&
        board[c] === null
      ) {
        return c;
      }
      if (
        board[a] === player &&
        board[c] === player &&
        board[b] === null
      ) {
        return b;
      }
      if (
        board[b] === player &&
        board[c] === player &&
        board[a] === null
      ) {
        return a;
      }
    }

    // Block opponent's winning move
    const opponent = player === "X" ? "O" : "X";
    for (const [a, b, c] of WINNING_LINES) {
      if (
        board[a] === opponent &&
        board[b] === opponent &&
        board[c] === null
      ) {
        return c;
      }
      if (
        board[a] === opponent &&
        board[c] === opponent &&
        board[b] === null
      ) {
        return b;
      }
      if (
        board[b] === opponent &&
        board[c] === opponent &&
        board[a] === null
      ) {
        return a;
      }
    }

    // Take center if available
    if (board[4] === null) return 4;

    // Take a corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter((i) => board[i] === null);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // Take any available side
    const sides = [1, 3, 5, 7];
    const availableSides = sides.filter((i) => board[i] === null);
    if (availableSides.length > 0) {
      return availableSides[Math.floor(Math.random() * availableSides.length)];
    }

    // Fallback
    return board.findIndex((cell) => cell === null);
  };

  const handleCellPress = (index: number) => {
    if (board[index] !== null || winner || isAIThinking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result);
      Haptics.notificationAsync(
        result === "X"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      if (result !== "draw") {
        setScores((s) => ({ ...s, [result]: s[result] + 1 }));
      } else {
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
      }
      return;
    }

    if (gameMode === "ai") {
      setCurrentPlayer("O");
      makeAIMove(newBoard);
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer("X");
    setWinner(null);
    setWinningLine(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  // Mode selection screen
  if (!gameMode) {
    return (
      <LinearGradient colors={["#ec4899", "#f472b6", "#f9a8d4"]} style={{ flex: 1 }}>
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
            <Text className="text-6xl mb-4">⭕</Text>
            <Text className="text-4xl font-bold text-white mb-2">
              Tic Tac Toe
            </Text>
            <Text className="text-pink-200 text-lg text-center mb-8">
              Choose how to play!
            </Text>

            <View className="w-full space-y-4">
              <TouchableOpacity
                className="bg-white py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => setGameMode("ai")}
              >
                <Text className="text-2xl mr-2">🤖</Text>
                <Text className="text-pink-600 font-bold text-lg">
                  Play vs Computer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/80 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => setGameMode("friend")}
              >
                <Text className="text-2xl mr-2">👥</Text>
                <Text className="text-pink-600 font-bold text-lg">
                  Play with Friend
                </Text>
              </TouchableOpacity>
            </View>

            {/* Difficulty selector for AI mode */}
            <View className="mt-8 w-full">
              <Text className="text-white font-bold text-center mb-3">
                AI Difficulty
              </Text>
              <View className="flex-row justify-center space-x-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <TouchableOpacity
                    key={d}
                    className={`px-4 py-2 rounded-full ${
                      difficulty === d ? "bg-white" : "bg-white/30"
                    }`}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text
                      className={`font-bold capitalize ${
                        difficulty === d ? "text-pink-600" : "text-white"
                      }`}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Game screen
  return (
    <LinearGradient colors={["#ec4899", "#f472b6", "#f9a8d4"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={() => setGameMode(null)}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <Text className="text-white font-bold text-lg">
            {gameMode === "ai" ? "vs Computer" : "vs Friend"}
          </Text>

          <TouchableOpacity
            onPress={resetScores}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Scoreboard */}
        <View className="flex-row justify-around px-4 my-4">
          <View className="items-center">
            <View
              className={`w-16 h-16 rounded-xl items-center justify-center ${
                currentPlayer === "X" && !winner
                  ? "bg-white"
                  : "bg-white/40"
              }`}
            >
              <Text className="text-3xl font-bold text-pink-600">X</Text>
            </View>
            <Text className="text-white font-bold text-lg mt-1">
              {scores.X}
            </Text>
            <Text className="text-pink-200 text-sm">You</Text>
          </View>

          <View className="items-center">
            <View className="w-16 h-16 rounded-xl items-center justify-center bg-white/20">
              <Text className="text-white text-sm font-bold">DRAWS</Text>
            </View>
            <Text className="text-white font-bold text-lg mt-1">
              {scores.draws}
            </Text>
          </View>

          <View className="items-center">
            <View
              className={`w-16 h-16 rounded-xl items-center justify-center ${
                currentPlayer === "O" && !winner
                  ? "bg-white"
                  : "bg-white/40"
              }`}
            >
              <Text className="text-3xl font-bold text-pink-600">O</Text>
            </View>
            <Text className="text-white font-bold text-lg mt-1">
              {scores.O}
            </Text>
            <Text className="text-pink-200 text-sm">
              {gameMode === "ai" ? "AI" : "Friend"}
            </Text>
          </View>
        </View>

        {/* Game Status */}
        <View className="items-center my-4">
          {winner ? (
            <View className="bg-white px-6 py-3 rounded-full">
              <Text className="text-pink-600 font-bold text-lg">
                {winner === "draw"
                  ? "It's a Draw! 🤝"
                  : winner === "X"
                  ? "You Win! 🎉"
                  : gameMode === "ai"
                  ? "AI Wins! 🤖"
                  : "O Wins! 🎉"}
              </Text>
            </View>
          ) : isAIThinking ? (
            <View className="bg-white/20 px-6 py-3 rounded-full">
              <Text className="text-white font-bold">AI is thinking...</Text>
            </View>
          ) : (
            <View className="bg-white/20 px-6 py-3 rounded-full">
              <Text className="text-white font-bold">
                {currentPlayer === "X" ? "Your turn" : "O's turn"}
              </Text>
            </View>
          )}
        </View>

        {/* Board */}
        <View className="flex-1 items-center justify-center">
          <View
            className="bg-white/20 rounded-3xl p-2"
            style={{ width: BOARD_SIZE + 16, height: BOARD_SIZE + 16 }}
          >
            <View className="flex-row flex-wrap">
              {board.map((cell, index) => {
                const isWinningCell = winningLine?.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    className={`items-center justify-center ${
                      isWinningCell ? "bg-yellow-400" : "bg-white"
                    }`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 16,
                      margin: 2,
                    }}
                    onPress={() => handleCellPress(index)}
                    disabled={!!winner || isAIThinking}
                  >
                    {cell && (
                      <Text
                        className={`font-bold ${
                          cell === "X" ? "text-pink-500" : "text-purple-500"
                        }`}
                        style={{ fontSize: CELL_SIZE * 0.5 }}
                      >
                        {cell}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Play Again Button */}
        {winner && (
          <View className="px-6 pb-6">
            <TouchableOpacity
              className="bg-white py-4 rounded-2xl"
              onPress={resetGame}
            >
              <Text className="text-pink-600 font-bold text-lg text-center">
                Play Again
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
