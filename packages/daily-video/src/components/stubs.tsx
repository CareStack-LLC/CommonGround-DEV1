/**
 * Stub video components for Expo Go
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { CallParticipant } from '../types';

interface VideoViewProps {
  participant: CallParticipant;
  style?: ViewStyle;
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  zOrder?: number;
}

export function VideoView({ participant, style }: VideoViewProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderText}>
        Video not available in Expo Go
      </Text>
      <Text style={styles.participantName}>
        {participant.userName}
      </Text>
    </View>
  );
}

interface CallControlsProps {
  style?: ViewStyle;
}

export function CallControls({ style }: CallControlsProps) {
  return (
    <View style={[styles.controls, style]}>
      <Text style={styles.controlsText}>
        Call controls not available in Expo Go
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  participantName: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  controls: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlsText: {
    color: '#888',
    fontSize: 12,
  },
});
