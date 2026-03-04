/**
 * Video Call Screen for Parent App
 * Uses Daily.co for video calling with full controls
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useDailyCall, VideoView } from '@commonground/daily-video';

const { width, height } = Dimensions.get('window');

export default function CallScreen() {
  const { sessionId, recipientId, recipientType, familyFileId, recipientName, callType } =
    useLocalSearchParams<{
      sessionId?: string;
      recipientId?: string;
      recipientType?: string;
      familyFileId?: string;
      recipientName?: string;
      callType?: 'video' | 'audio';
    }>();

  const {
    callState,
    session,
    participants,
    localParticipant,
    isVideoOn,
    isAudioOn,
    isRecording,
    callDuration,
    error,
    initiateCall,
    joinCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
    startRecording,
    stopRecording,
  } = useDailyCall();

  const [showControls, setShowControls] = useState(true);
  const isAudioOnly = callType === 'audio';

  // Initialize call on mount
  useEffect(() => {
    const initCall = async () => {
      // Check if this is a new call (sessionId === 'new') or joining an existing one
      const isNewCall = sessionId === 'new' || !sessionId;

      if (!isNewCall && sessionId) {
        // Joining an existing call
        console.log('[Call] Joining existing call:', sessionId);
        await joinCall(sessionId, {
          videoEnabled: !isAudioOnly,
          audioEnabled: true,
        });
      } else if (recipientId && recipientType && familyFileId) {
        // Initiating a new call
        console.log('[Call] Initiating new call to:', recipientId, 'type:', callType);
        await initiateCall(
          recipientId,
          recipientType as 'parent' | 'child' | 'circle',
          familyFileId,
          {
            videoEnabled: !isAudioOnly,
            audioEnabled: true,
            userName: recipientName || 'Parent',
          }
        );
      } else {
        console.error('[Call] Missing required parameters');
        Alert.alert('Error', 'Unable to start call. Missing required information.');
        router.back();
      }
    };

    initCall();

    // Hide controls after 5 seconds
    const timer = setTimeout(() => setShowControls(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Handle call end
  useEffect(() => {
    if (callState === 'ended') {
      setTimeout(() => router.back(), 500);
    }
  }, [callState]);

  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await endCall();
  };

  const handleToggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleVideo();
  };

  const handleToggleAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAudio();
  };

  const handleSwitchCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchCamera();
  };

  const handleToggleRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      await stopRecording();
    } else {
      const started = await startRecording();
      if (started) {
        Alert.alert('Recording Started', 'This call is now being recorded.');
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call Ended';
      case 'error':
        return error || 'Error';
      default:
        return '';
    }
  };

  const remoteParticipant = participants[0];

  // Loading/connecting state
  if (callState === 'idle' || callState === 'connecting') {
    return (
      <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.statusText}>Connecting...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Error state
  if (callState === 'error') {
    return (
      <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <Ionicons name="warning" size={64} color="white" />
          <Text style={styles.statusText}>{error || 'Call failed'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote Video (full screen) */}
      <TouchableOpacity
        style={styles.remoteVideoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        {remoteParticipant && !isAudioOnly ? (
          <VideoView
            participant={remoteParticipant}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.waitingContainer}>
            <View style={[styles.avatarPlaceholder, isAudioOnly && styles.avatarPlaceholderAudio]}>
              {isAudioOnly ? (
                <Ionicons name="volume-high" size={60} color="white" />
              ) : (
                <Text style={styles.avatarEmoji}>
                  {recipientType === 'child' ? '👧' : '👤'}
                </Text>
              )}
            </View>
            <Text style={styles.waitingText}>
              {recipientName || 'Participant'}
            </Text>
            <Text style={styles.waitingSubtext}>
              {callState === 'ringing'
                ? 'Ringing...'
                : callState === 'connected'
                  ? (isAudioOnly ? 'Audio call in progress' : 'Waiting for video...')
                  : 'Waiting to join...'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Local Video (picture-in-picture) */}
      {localParticipant && isVideoOn && (
        <View style={styles.localVideoContainer}>
          <VideoView
            participant={localParticipant}
            style={styles.localVideo}
            mirror
            objectFit="cover"
          />
        </View>
      )}

      {/* Top Bar */}
      {showControls && (
        <SafeAreaView style={styles.topBar}>
          <View style={styles.topBarContent}>
            {/* Recording indicator */}
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
            )}

            {/* Call duration */}
            <View style={styles.durationContainer}>
              <Text style={styles.durationText}>{getStatusText()}</Text>
            </View>

            {/* Switch camera */}
            <TouchableOpacity style={styles.topButton} onPress={handleSwitchCamera}>
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <SafeAreaView style={styles.bottomBar}>
          <View style={styles.controlsRow}>
            {/* Mute */}
            <TouchableOpacity
              style={[styles.controlButton, !isAudioOn && styles.controlButtonActive]}
              onPress={handleToggleAudio}
            >
              <Ionicons
                name={isAudioOn ? 'mic' : 'mic-off'}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* Camera */}
            <TouchableOpacity
              style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
              onPress={handleToggleVideo}
            >
              <Ionicons
                name={isVideoOn ? 'videocam' : 'videocam-off'}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
              <Ionicons
                name="call"
                size={32}
                color="white"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </TouchableOpacity>

            {/* Record (Parent only) */}
            <TouchableOpacity
              style={[styles.controlButton, isRecording && styles.recordingButton]}
              onPress={handleToggleRecording}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'radio-button-on'}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* Speaker */}
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="volume-high" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholderAudio: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#4A6C58', // SAGE color
  },
  avatarEmoji: {
    fontSize: 60,
  },
  waitingText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  waitingSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  localVideo: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  durationContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
});
