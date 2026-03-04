/**
 * Video view component for displaying participant video
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { DailyMediaView } from '@daily-co/react-native-daily-js';

import { CallParticipant } from '../types';

interface VideoViewProps {
  participant: CallParticipant;
  style?: ViewStyle;
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  zOrder?: number;
}

export function VideoView({
  participant,
  style,
  mirror = false,
  objectFit = 'cover',
  zOrder = 0,
}: VideoViewProps) {
  if (!participant.isVideoOn) {
    return (
      <View style={[styles.placeholder, style]}>
        {/* Video off placeholder - can be customized */}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <DailyMediaView
        videoTrack={participant.sessionId ? { participantId: participant.sessionId } : null}
        audioTrack={null}
        mirror={mirror}
        objectFit={objectFit}
        zOrder={zOrder}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  placeholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
