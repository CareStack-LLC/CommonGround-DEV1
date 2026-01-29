/**
 * My Time Collections Screen
 *
 * Manage collections of time blocks for each child.
 * Collections represent availability patterns (e.g., "Work Hours", "Soccer Days").
 * Features:
 * - Create/edit/delete collections
 * - Color coding for each collection
 * - View time blocks per collection
 * - Default collection management
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  parent,
  type MyTimeCollection,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

// Available colors for collections
const COLLECTION_COLORS = [
  "#4A6C58", // Sage
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#6B7280", // Gray
];

export default function CollectionsScreen() {
  const { user } = useAuth();
  const { children } = useFamilyFile();

  const [collections, setCollections] = useState<MyTimeCollection[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MyTimeCollection | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLLECTION_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Set default selected child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const fetchCollections = useCallback(async () => {
    if (!selectedChildId) return;

    try {
      const data = await parent.events.getCollections(selectedChildId);
      setCollections(data);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      // Demo data
      setCollections([
        {
          id: "col-1",
          family_file_id: "demo",
          child_id: selectedChildId,
          name: "Regular Schedule",
          color: "#4A6C58",
          is_default: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "col-2",
          family_file_id: "demo",
          child_id: selectedChildId,
          name: "Summer Break",
          color: "#F59E0B",
          is_default: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "col-3",
          family_file_id: "demo",
          child_id: selectedChildId,
          name: "Soccer Season",
          color: "#22C55E",
          is_default: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (selectedChildId) {
      setIsLoading(true);
      fetchCollections();
    }
  }, [selectedChildId, fetchCollections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedChildId) {
      Alert.alert("Missing Name", "Please enter a collection name.");
      return;
    }

    setSaving(true);
    try {
      const created = await parent.events.createCollection({
        family_file_id: user?.family_file_id || "demo",
        child_id: selectedChildId,
        name: newName.trim(),
        color: newColor,
      });
      setCollections((prev) => [...prev, created]);
      setShowCreateModal(false);
      setNewName("");
      setNewColor(COLLECTION_COLORS[0]);
    } catch (error) {
      console.error("Failed to create collection:", error);
      // Demo mode
      const newCol: MyTimeCollection = {
        id: `col-${Date.now()}`,
        family_file_id: "demo",
        child_id: selectedChildId,
        name: newName.trim(),
        color: newColor,
        is_default: false,
        created_at: new Date().toISOString(),
      };
      setCollections((prev) => [...prev, newCol]);
      setShowCreateModal(false);
      setNewName("");
      setNewColor(COLLECTION_COLORS[0]);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCollection || !newName.trim()) return;

    setSaving(true);
    try {
      const updated = await parent.events.updateCollection(editingCollection.id, {
        name: newName.trim(),
        color: newColor,
      });
      setCollections((prev) =>
        prev.map((c) => (c.id === editingCollection.id ? updated : c))
      );
      setEditingCollection(null);
      setNewName("");
      setNewColor(COLLECTION_COLORS[0]);
    } catch (error) {
      console.error("Failed to update collection:", error);
      // Demo mode
      setCollections((prev) =>
        prev.map((c) =>
          c.id === editingCollection.id
            ? { ...c, name: newName.trim(), color: newColor }
            : c
        )
      );
      setEditingCollection(null);
      setNewName("");
      setNewColor(COLLECTION_COLORS[0]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (collection: MyTimeCollection) => {
    if (collection.is_default) {
      Alert.alert("Cannot Delete", "The default collection cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Collection",
      `Are you sure you want to delete "${collection.name}"? All time blocks in this collection will also be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await parent.events.deleteCollection(collection.id);
              setCollections((prev) => prev.filter((c) => c.id !== collection.id));
            } catch (error) {
              console.error("Failed to delete collection:", error);
              setCollections((prev) => prev.filter((c) => c.id !== collection.id));
            }
          },
        },
      ]
    );
  };

  const openEditModal = (collection: MyTimeCollection) => {
    setEditingCollection(collection);
    setNewName(collection.name);
    setNewColor(collection.color);
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        {/* Child Selector */}
        {children.length > 1 && (
          <View className="mb-4">
            <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
              Select Child
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: selectedChildId === child.id ? colors.sage : "white",
                    }}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text
                      className="font-medium"
                      style={{
                        color: selectedChildId === child.id ? "white" : colors.slate,
                      }}
                    >
                      {child.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Info Card */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.sage}15` }}
            >
              <Ionicons name="information-circle" size={24} color={colors.sage} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium" style={{ color: colors.slate }}>
                What are Collections?
              </Text>
              <Text className="text-sm text-slate-500 mt-1">
                Collections group time blocks together. Create different collections for different
                schedules (e.g., "School Year", "Summer Break").
              </Text>
            </View>
          </View>
        </View>

        {/* Collections List */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-semibold" style={{ color: colors.slate }}>
            {selectedChild?.first_name}'s Collections
          </Text>
          <TouchableOpacity
            className="flex-row items-center px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: `${colors.sage}15` }}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={18} color={colors.sage} />
            <Text className="ml-1 font-medium" style={{ color: colors.sage }}>
              New
            </Text>
          </TouchableOpacity>
        </View>

        {collections.length === 0 ? (
          <View className="bg-white rounded-2xl items-center py-8">
            <Ionicons name="folder-open-outline" size={48} color="#94a3b8" />
            <Text className="text-slate-500 mt-3">No collections yet</Text>
            <TouchableOpacity
              className="mt-4 px-4 py-2 rounded-xl"
              style={{ backgroundColor: colors.sage }}
              onPress={() => setShowCreateModal(true)}
            >
              <Text className="text-white font-medium">Create First Collection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {collections.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                className="bg-white rounded-2xl p-4"
                onPress={() => router.push(`/schedule/time-blocks?collectionId=${collection.id}&name=${encodeURIComponent(collection.name)}`)}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${collection.color}20` }}
                  >
                    <View
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: collection.color }}
                    />
                  </View>

                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className="font-semibold" style={{ color: colors.slate }}>
                        {collection.name}
                      </Text>
                      {collection.is_default && (
                        <View
                          className="ml-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.sage}15` }}
                        >
                          <Text className="text-xs font-medium" style={{ color: colors.sage }}>
                            Default
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-slate-500 mt-0.5">
                      Tap to manage time blocks
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-1">
                    <TouchableOpacity
                      className="p-2"
                      onPress={() => openEditModal(collection)}
                    >
                      <Ionicons name="pencil" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    {!collection.is_default && (
                      <TouchableOpacity
                        className="p-2"
                        onPress={() => handleDelete(collection)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal || !!editingCollection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingCollection(null);
          setNewName("");
          setNewColor(COLLECTION_COLORS[0]);
        }}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }}>
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.sand }}>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setEditingCollection(null);
                setNewName("");
                setNewColor(COLLECTION_COLORS[0]);
              }}
            >
              <Text style={{ color: colors.sage }}>Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold" style={{ color: colors.slate }}>
              {editingCollection ? "Edit Collection" : "New Collection"}
            </Text>
            <TouchableOpacity
              onPress={editingCollection ? handleUpdate : handleCreate}
              disabled={saving || !newName.trim()}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.sage} />
              ) : (
                <Text
                  className="font-semibold"
                  style={{ color: newName.trim() ? colors.sage : "#94a3b8" }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="p-4">
            {/* Name Input */}
            <View className="mb-6">
              <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
                Collection Name
              </Text>
              <TextInput
                className="rounded-xl px-4 py-3"
                style={{
                  backgroundColor: "white",
                  color: colors.slate,
                  fontSize: 16,
                }}
                placeholder="e.g., School Year Schedule"
                placeholderTextColor="#9CA3AF"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
            </View>

            {/* Color Selection */}
            <View>
              <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                Color
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {COLLECTION_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    className="w-1/5 p-1"
                    onPress={() => setNewColor(color)}
                  >
                    <View
                      className="aspect-square rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: `${color}20`,
                        borderWidth: newColor === color ? 3 : 0,
                        borderColor: color,
                      }}
                    >
                      <View
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {newColor === color && (
                        <View className="absolute">
                          <Ionicons name="checkmark" size={20} color="white" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
