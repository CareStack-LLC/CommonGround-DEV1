/**
 * Fun Quiz Game
 * Test your knowledge with fun questions!
 */

import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface Question {
  id: number;
  question: string;
  emoji: string;
  options: string[];
  correctIndex: number;
  category: string;
}

const QUESTIONS: Question[] = [
  // Animals
  {
    id: 1,
    question: "What animal is the largest on Earth?",
    emoji: "🐋",
    options: ["Elephant", "Blue Whale", "Giraffe", "Shark"],
    correctIndex: 1,
    category: "Animals",
  },
  {
    id: 2,
    question: "How many legs does a spider have?",
    emoji: "🕷️",
    options: ["6", "8", "10", "4"],
    correctIndex: 1,
    category: "Animals",
  },
  {
    id: 3,
    question: "What sound does a cow make?",
    emoji: "🐄",
    options: ["Woof", "Meow", "Moo", "Quack"],
    correctIndex: 2,
    category: "Animals",
  },
  // Science
  {
    id: 4,
    question: "What planet is known as the Red Planet?",
    emoji: "🪐",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctIndex: 1,
    category: "Science",
  },
  {
    id: 5,
    question: "How many colors are in a rainbow?",
    emoji: "🌈",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
    category: "Science",
  },
  {
    id: 6,
    question: "What do plants need to grow?",
    emoji: "🌱",
    options: ["Candy", "Sunlight and water", "Ice cream", "Toys"],
    correctIndex: 1,
    category: "Science",
  },
  // Geography
  {
    id: 7,
    question: "What is the largest ocean?",
    emoji: "🌊",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    correctIndex: 2,
    category: "Geography",
  },
  {
    id: 8,
    question: "Where do polar bears live?",
    emoji: "🐻‍❄️",
    options: ["Desert", "Arctic", "Jungle", "Beach"],
    correctIndex: 1,
    category: "Geography",
  },
  // Food
  {
    id: 9,
    question: "What fruit is yellow and curved?",
    emoji: "🍌",
    options: ["Apple", "Banana", "Orange", "Grape"],
    correctIndex: 1,
    category: "Food",
  },
  {
    id: 10,
    question: "Which food do rabbits love to eat?",
    emoji: "🥕",
    options: ["Pizza", "Carrots", "Ice cream", "Hamburger"],
    correctIndex: 1,
    category: "Food",
  },
  // Numbers
  {
    id: 11,
    question: "What is 5 + 3?",
    emoji: "🔢",
    options: ["6", "7", "8", "9"],
    correctIndex: 2,
    category: "Math",
  },
  {
    id: 12,
    question: "How many sides does a triangle have?",
    emoji: "🔺",
    options: ["2", "3", "4", "5"],
    correctIndex: 1,
    category: "Math",
  },
];

type QuizCategory = "all" | "Animals" | "Science" | "Geography" | "Food" | "Math";

export default function QuizGameScreen() {
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [category, setCategory] = useState<QuizCategory>("all");
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleTimeout();
          return 15;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const handleTimeout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setStreak(0);
    moveToNextQuestion();
  };

  const startGame = (selectedCategory: QuizCategory) => {
    setCategory(selectedCategory);

    let filteredQuestions = QUESTIONS;
    if (selectedCategory !== "all") {
      filteredQuestions = QUESTIONS.filter((q) => q.category === selectedCategory);
    }

    // Shuffle and take 5 questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5).slice(0, 5);
    setQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameStarted(true);
    setTimeLeft(15);
    setTimerActive(true);
  };

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;

    setTimerActive(false);
    setSelectedAnswer(answerIndex);
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const streakBonus = streak >= 2 ? streak : 0;
      setScore((s) => s + 10 + streakBonus * 2);
      setStreak((s) => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
    }

    // Move to next question after delay
    setTimeout(() => {
      moveToNextQuestion();
    }, 1500);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
      setSelectedAnswer(null);
      setTimeLeft(15);
      setTimerActive(true);
    } else {
      setShowResult(true);
      setTimerActive(false);
    }
  };

  const getStars = (): number => {
    const percentage = score / (questions.length * 10);
    if (percentage >= 0.8) return 3;
    if (percentage >= 0.5) return 2;
    return 1;
  };

  // Category selection screen
  if (!gameStarted) {
    return (
      <LinearGradient colors={["#f97316", "#fb923c", "#fdba74"]} style={{ flex: 1 }}>
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
            <Text className="text-6xl mb-4">❓</Text>
            <Text className="text-4xl font-bold text-white mb-2">Fun Quiz</Text>
            <Text className="text-orange-200 text-lg text-center mb-8">
              Choose a category!
            </Text>

            <View className="w-full space-y-3">
              <TouchableOpacity
                className="bg-white py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => startGame("all")}
              >
                <Text className="text-2xl mr-2">🎲</Text>
                <Text className="text-orange-600 font-bold text-lg">
                  All Categories
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/90 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => startGame("Animals")}
              >
                <Text className="text-2xl mr-2">🐾</Text>
                <Text className="text-orange-600 font-bold text-lg">Animals</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/80 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => startGame("Science")}
              >
                <Text className="text-2xl mr-2">🔬</Text>
                <Text className="text-orange-600 font-bold text-lg">Science</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white/70 py-4 rounded-2xl flex-row items-center justify-center"
                onPress={() => startGame("Math")}
              >
                <Text className="text-2xl mr-2">🔢</Text>
                <Text className="text-orange-600 font-bold text-lg">Math</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Results screen
  if (showResult) {
    const stars = getStars();
    return (
      <LinearGradient colors={["#f97316", "#fb923c", "#fdba74"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-8 items-center w-full">
            <Text className="text-6xl mb-4">🏆</Text>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Quiz Complete!
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

            {/* Score */}
            <View className="bg-orange-100 rounded-2xl p-4 w-full items-center my-4">
              <Text className="text-5xl font-bold text-orange-600">{score}</Text>
              <Text className="text-orange-500">Points</Text>
            </View>

            {/* Actions */}
            <View className="w-full space-y-3 mt-4">
              <TouchableOpacity
                className="bg-orange-500 py-4 rounded-2xl"
                onPress={() => startGame(category)}
              >
                <Text className="text-white font-bold text-lg text-center">
                  Play Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-gray-100 py-4 rounded-2xl"
                onPress={() => setGameStarted(false)}
              >
                <Text className="text-gray-600 font-bold text-lg text-center">
                  Change Category
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
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <LinearGradient colors={["#f97316", "#fb923c", "#fdba74"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-row items-center space-x-3">
            {/* Streak */}
            {streak >= 2 && (
              <View className="bg-yellow-400 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-yellow-900 font-bold">🔥 {streak}</Text>
              </View>
            )}

            {/* Score */}
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-bold">{score} pts</Text>
            </View>
          </View>

          {/* Timer */}
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              timeLeft <= 5 ? "bg-red-500" : "bg-white/20"
            }`}
          >
            <Text className="text-white font-bold text-lg">{timeLeft}</Text>
          </View>
        </View>

        {/* Progress */}
        <View className="px-4 my-2">
          <View className="flex-row space-x-1">
            {questions.map((_, i) => (
              <View
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i < currentQuestionIndex
                    ? "bg-white"
                    : i === currentQuestionIndex
                    ? "bg-white/60"
                    : "bg-white/30"
                }`}
              />
            ))}
          </View>
          <Text className="text-white text-center mt-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        {/* Question */}
        <View className="flex-1 px-6 justify-center">
          <View className="bg-white rounded-3xl p-6 mb-6">
            <Text className="text-6xl text-center mb-4">
              {currentQuestion.emoji}
            </Text>
            <Text className="text-xl font-bold text-gray-800 text-center">
              {currentQuestion.question}
            </Text>
            <Text className="text-orange-500 text-center mt-2">
              {currentQuestion.category}
            </Text>
          </View>

          {/* Options */}
          <View className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showCorrect = selectedAnswer !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  className={`py-4 px-6 rounded-2xl ${
                    showCorrect
                      ? "bg-green-500"
                      : showWrong
                      ? "bg-red-500"
                      : isSelected
                      ? "bg-orange-500"
                      : "bg-white"
                  }`}
                  onPress={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                >
                  <Text
                    className={`text-lg font-bold text-center ${
                      showCorrect || showWrong || isSelected
                        ? "text-white"
                        : "text-gray-800"
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
