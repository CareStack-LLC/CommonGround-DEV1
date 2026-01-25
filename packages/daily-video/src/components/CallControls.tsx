/**
 * Call controls component
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';

import { useDailyCall } from '../DailyCallProvider';

interface CallControlsProps {
  style?: ViewStyle;
  showRecordButton?: boolean;
  renderMuteButton?: (props: { isMuted: boolean; onPress: () => void }) => React.ReactNode;
  renderVideoButton?: (props: { isVideoOff: boolean; onPress: () => void }) => React.ReactNode;
  renderEndCallButton?: (props: { onPress: () => void }) => React.ReactNode;
  renderSwitchCameraButton?: (props: { onPress: () => void }) => React.ReactNode;
  renderSpeakerButton?: (props: { isSpeakerOn: boolean; onPress: () => void }) => React.ReactNode;
  renderRecordButton?: (props: {
    isRecording: boolean;
    onPress: () => void;
  }) => React.ReactNode;
}

export function CallControls({
  style,
  showRecordButton = false,
  renderMuteButton,
  renderVideoButton,
  renderEndCallButton,
  renderSwitchCameraButton,
  renderSpeakerButton,
  renderRecordButton,
}: CallControlsProps) {
  const {
    isAudioOn,
    isVideoOn,
    isSpeakerOn,
    isRecording,
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    endCall,
    startRecording,
    stopRecording,
  } = useDailyCall();

  const handleRecordPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Mute/Unmute */}
      {renderMuteButton ? (
        renderMuteButton({ isMuted: !isAudioOn, onPress: toggleAudio })
      ) : (
        <TouchableOpacity
          style={[styles.button, !isAudioOn && styles.buttonActive]}
          onPress={toggleAudio}
        >
          {/* Default mic icon */}
        </TouchableOpacity>
      )}

      {/* Video On/Off */}
      {renderVideoButton ? (
        renderVideoButton({ isVideoOff: !isVideoOn, onPress: toggleVideo })
      ) : (
        <TouchableOpacity
          style={[styles.button, !isVideoOn && styles.buttonActive]}
          onPress={toggleVideo}
        >
          {/* Default camera icon */}
        </TouchableOpacity>
      )}

      {/* End Call */}
      {renderEndCallButton ? (
        renderEndCallButton({ onPress: () => endCall() })
      ) : (
        <TouchableOpacity style={styles.endCallButton} onPress={() => endCall()}>
          {/* Default end call icon */}
        </TouchableOpacity>
      )}

      {/* Switch Camera */}
      {renderSwitchCameraButton ? (
        renderSwitchCameraButton({ onPress: switchCamera })
      ) : (
        <TouchableOpacity style={styles.button} onPress={switchCamera}>
          {/* Default switch camera icon */}
        </TouchableOpacity>
      )}

      {/* Speaker */}
      {renderSpeakerButton ? (
        renderSpeakerButton({ isSpeakerOn, onPress: toggleSpeaker })
      ) : (
        <TouchableOpacity
          style={[styles.button, !isSpeakerOn && styles.buttonActive]}
          onPress={toggleSpeaker}
        >
          {/* Default speaker icon */}
        </TouchableOpacity>
      )}

      {/* Record (optional, parent only) */}
      {showRecordButton &&
        (renderRecordButton ? (
          renderRecordButton({ isRecording, onPress: handleRecordPress })
        ) : (
          <TouchableOpacity
            style={[styles.button, isRecording && styles.recordingActive]}
            onPress={handleRecordPress}
          >
            {/* Default record icon */}
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buttonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
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
  recordingActive: {
    backgroundColor: '#ef4444',
  },
});
