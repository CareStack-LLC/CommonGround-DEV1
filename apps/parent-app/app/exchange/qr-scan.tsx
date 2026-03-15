/**
 * QR Code Scanner Screen
 *
 * Scans QR code from the other parent to confirm custody exchange.
 * Features:
 * - Camera permission handling
 * - QR code detection and validation
 * - Success/failure feedback
 * - Auto-close on success
 */

import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import { parent } from "@commonground/api-client";
import { useTheme } from "@/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.75;

type ScanStatus = "scanning" | "processing" | "success" | "error";

export default function QRScanScreen() {
  const { colors } = useTheme();
  const { instanceId } = useLocalSearchParams<{ instanceId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStatus, setScanStatus] = useState<ScanStatus>("scanning");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: "#000",
        },
        overlay: {
          flex: 1,
          backgroundColor: "transparent",
        },
        topSection: {
          flex: 0.25,
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingHorizontal: 20,
        },
        closeButton: {
          position: "absolute",
          top: 60,
          left: 20,
          padding: 8,
          zIndex: 10,
        },
        header: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 40,
        },
        headerTitle: {
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 8,
        },
        headerSubtitle: {
          color: "rgba(255,255,255,0.8)",
          fontSize: 14,
          textAlign: "center",
          paddingHorizontal: 40,
        },
        scanAreaContainer: {
          flex: 0.5,
          justifyContent: "center",
          alignItems: "center",
        },
        scanArea: {
          width: SCAN_AREA_SIZE,
          height: SCAN_AREA_SIZE,
          position: "relative",
        },
        corner: {
          position: "absolute",
          width: 30,
          height: 30,
          borderColor: colors.primary,
          borderWidth: 4,
        },
        topLeft: {
          top: 0,
          left: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderTopLeftRadius: 12,
        },
        topRight: {
          top: 0,
          right: 0,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
          borderTopRightRadius: 12,
        },
        bottomLeft: {
          bottom: 0,
          left: 0,
          borderRightWidth: 0,
          borderTopWidth: 0,
          borderBottomLeftRadius: 12,
        },
        bottomRight: {
          bottom: 0,
          right: 0,
          borderLeftWidth: 0,
          borderTopWidth: 0,
          borderBottomRightRadius: 12,
        },
        statusOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(255,255,255,0.95)",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 12,
        },
        statusText: {
          marginTop: 16,
          fontSize: 18,
          fontWeight: "600",
          color: colors.secondary,
        },
        successIcon: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        },
        bottomSection: {
          flex: 0.25,
          backgroundColor: "rgba(0,0,0,0.6)",
          paddingHorizontal: 20,
          paddingTop: 20,
        },
        helpCard: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.9)",
          padding: 16,
          borderRadius: 12,
          marginBottom: 16,
        },
        helpText: {
          flex: 1,
          marginLeft: 12,
          color: colors.secondary,
          fontSize: 14,
        },
        manualButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
        },
        manualButtonText: {
          color: "rgba(255,255,255,0.8)",
          marginLeft: 8,
          fontSize: 14,
        },
      }),
    [colors]
  );

  // Request permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || scanStatus !== "scanning") return;

    setScanned(true);
    setScanStatus("processing");

    try {
      // Parse QR data
      let qrData: {
        type: string;
        instance_id: string;
        token: string;
      };

      try {
        qrData = JSON.parse(data);
      } catch {
        throw new Error("Invalid QR code format");
      }

      // Validate QR data
      if (qrData.type !== "custody_exchange") {
        throw new Error("This is not a custody exchange QR code");
      }

      if (!qrData.token || !qrData.instance_id) {
        throw new Error("Invalid QR code data");
      }

      // Confirm exchange with API
      const result = await parent.custody.confirmWithQR({
        exchange_instance_id: qrData.instance_id,
        qr_token: qrData.token,
      });

      if (result.success) {
        setScanStatus("success");

        // Show success and navigate back
        setTimeout(() => {
          Alert.alert(
            "Exchange Confirmed!",
            "The custody exchange has been successfully recorded.",
            [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]
          );
        }, 1500);
      } else {
        throw new Error(result.message || "Exchange confirmation failed");
      }
    } catch (err: any) {
      console.error("QR confirmation failed:", err);
      setScanStatus("error");
      setErrorMessage(err.message || "Failed to confirm exchange");

      // Allow retry after error
      setTimeout(() => {
        setScanned(false);
        setScanStatus("scanning");
        setErrorMessage(null);
      }, 3000);
    }
  };

  // Permission not granted yet
  if (!permission) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "#000" }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: `${colors.accent}20` }}
        >
          <Ionicons name="camera-outline" size={40} color={colors.accent} />
        </View>
        <Text className="text-xl font-bold mb-2" style={{ color: colors.secondary }}>
          Camera Permission Required
        </Text>
        <Text className="text-center mb-6" style={{ color: colors.secondary }}>
          We need access to your camera to scan the QR code from your co-parent's phone.
        </Text>
        <TouchableOpacity
          className="py-4 px-8 rounded-xl"
          style={{ backgroundColor: colors.primary }}
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-4 py-2" onPress={() => router.back()}>
          <Text style={{ color: colors.secondary }}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanStatus === "scanning" ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top section */}
        <SafeAreaView style={styles.topSection}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSubtitle}>
              Point your camera at the QR code on your co-parent's phone
            </Text>
          </View>
        </SafeAreaView>

        {/* Scan area */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Status indicator */}
            {scanStatus === "processing" && (
              <View style={styles.statusOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.statusText}>Verifying...</Text>
              </View>
            )}

            {scanStatus === "success" && (
              <View style={styles.statusOverlay}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  Confirmed!
                </Text>
              </View>
            )}

            {scanStatus === "error" && (
              <View style={styles.statusOverlay}>
                <View style={[styles.successIcon, { backgroundColor: "#DC2626" }]}>
                  <Ionicons name="close" size={48} color="white" />
                </View>
                <Text style={[styles.statusText, { color: "#DC2626" }]}>
                  {errorMessage || "Failed"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          <View style={styles.helpCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.helpText}>
              Make sure the QR code is well-lit and within the frame
            </Text>
          </View>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              Alert.alert(
                "Manual Confirmation",
                "If you can't scan the QR code, both parents can confirm the exchange manually from the exchange details screen.",
                [{ text: "OK" }]
              );
            }}
          >
            <Ionicons name="hand-left-outline" size={20} color={colors.secondary} />
            <Text style={styles.manualButtonText}>Can't scan? Use manual confirmation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
