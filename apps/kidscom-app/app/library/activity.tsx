/**
 * Library Activity Screen
 *
 * Interactive learning activities for children.
 * Features:
 * - Multiple activity types (counting, colors, matching)
 * - Progress tracking
 * - Reward animations
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { child } from "@commonground/api-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Demo counting activity
const COUNTING_QUESTIONS = [
  {
    id: 1,
    question: "How many apples do you see?",
    emoji: "🍎",
    count: 3,
    options: [2, 3, 4, 5],
  },
  {
    id: 2,
    question: "How many stars are there?",
    emoji: "⭐",
    count: 5,
    options: [3, 4, 5, 6],
  },
  {
    id: 3,
    question: "Count the flowers!",
    emoji: "🌸",
    count: 4,
    options: [2, 3, 4, 5],
  },
  {
    id: 4,
    question: "How many hearts?",
    emoji: "❤️",
    count: 2,
    options: [1, 2, 3, 4],
  },
  {
    id: 5,
    question: "Count the butterflies!",
    emoji: "🦋",
    count: 6,
    options: [4, 5, 6, 7],
  },
];

export default function ActivityScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    title: string;
  }>();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const questions = COUNTING_QUESTIONS;
  const totalQuestions = questions.length;
  const progress = Math.round(((currentQuestion + 1) / totalQuestions) * 100);

  // Save progress
  useEffect(() => {
    if (!params.itemId || isComplete) return;

    const saveProgress = async () => {
      try {
        await child.kidcoms.updateProgress(params.itemId, progress);
      } catch {
        // Silent fail
      }
    };

    saveProgress();
  }, [currentQuestion, params.itemId, progress, isComplete]);

  const handleAnswer = (answer: number) => {
    if (selectedAnswer !== null) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAnswer(answer);

    const correct = answer === questions[currentQuestion].count;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Auto advance after delay
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsComplete(true);
        // Save 100% progress
        if (params.itemId) {
          child.kidcoms.updateProgress(params.itemId, 100).catch(() => {});
        }
      }
    }, 1500);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIsComplete(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-purple-50 items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-purple-800 text-lg mt-4">Loading activity...</Text>
      </View>
    );
  }

  // Completion screen
  if (isComplete) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const stars =
      percentage >= 80 ? 3 : percentage >= 60 ? 2 : percentage >= 40 ? 1 : 0;

    return (
      <View className="flex-1 bg-purple-50">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl mb-4">
            {stars >= 3 ? "🏆" : stars >= 2 ? "🌟" : stars >= 1 ? "⭐" : "💪"}
          </Text>

          <Text className="text-3xl font-bold text-purple-800 text-center mb-2">
            {stars >= 3
              ? "Amazing!"
              : stars >= 2
              ? "Great Job!"
              : stars >= 1
              ? "Good Try!"
              : "Keep Practicing!"}
          </Text>

          <Text className="text-xl text-purple-600 text-center mb-6">
            You got {score} out of {totalQuestions} correct!
          </Text>

          {/* Stars */}
          <View className="flex-row mb-8">
            {[1, 2, 3].map((star) => (
              <Text
                key={star}
                className="text-4xl mx-2"
                style={{ opacity: star <= stars ? 1 : 0.3 }}
              >
                ⭐
              </Text>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleRestart}
            className="bg-purple-500 px-8 py-4 rounded-full mb-4"
          >
            <Text className="text-white font-bold text-lg">Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClose}
            className="bg-gray-200 px-8 py-4 rounded-full"
          >
            <Text className="text-gray-700 font-bold text-lg">Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <View className="flex-1 bg-purple-50">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={handleClose}
            className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#8b5cf6" />
          </TouchableOpacity>

          <View className="flex-1 mx-4">
            <Text
              className="text-lg font-bold text-purple-800 text-center"
              numberOfLines={1}
            >
              {params.title || "Activity"}
            </Text>
            <Text className="text-purple-600 text-center text-sm">
              Question {currentQuestion + 1} of {totalQuestions}
            </Text>
          </View>

          <View className="bg-purple-100 px-3 py-1 rounded-full">
            <Text className="text-purple-800 font-bold">
              ⭐ {score}/{totalQuestions}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="h-2 bg-purple-200 mx-4 rounded-full">
          <View
            className="h-2 bg-purple-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-8 items-center justify-center">
          {/* Question */}
          <Text className="text-2xl font-bold text-purple-800 text-center mb-8">
            {currentQ.question}
          </Text>

          {/* Emoji display */}
          <View className="bg-white rounded-3xl p-6 mb-8 shadow-lg">
            <View className="flex-row flex-wrap justify-center">
              {Array.from({ length: currentQ.count }).map((_, index) => (
                <Text key={index} className="text-5xl m-2">
                  {currentQ.emoji}
                </Text>
              ))}
            </View>
          </View>

          {/* Feedback */}
          {isCorrect !== null && (
            <View
              className={`mb-4 px-6 py-2 rounded-full ${
                isCorrect ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`text-lg font-bold ${
                  isCorrect ? "text-green-600" : "text-red-600"
                }`}
              >
                {isCorrect ? "Correct! 🎉" : `Oops! It's ${currentQ.count}`}
              </Text>
            </View>
          )}

          {/* Options */}
          <View className="flex-row flex-wrap justify-center">
            {currentQ.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const showCorrect =
                selectedAnswer !== null && option === currentQ.count;
              const showWrong = isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleAnswer(option)}
                  disabled={selectedAnswer !== null}
                  className={`w-20 h-20 m-2 rounded-2xl items-center justify-center ${
                    showCorrect
                      ? "bg-green-500"
                      : showWrong
                      ? "bg-red-500"
                      : isSelected
                      ? "bg-purple-500"
                      : "bg-white border-2 border-purple-200"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  <Text
                    className={`text-3xl font-bold ${
                      showCorrect || showWrong || isSelected
                        ? "text-white"
                        : "text-purple-800"
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
    </View>
  );
}
