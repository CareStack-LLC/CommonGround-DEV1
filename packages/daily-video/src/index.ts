/**
 * @commonground/daily-video
 *
 * Shared Daily.co video calling package for CommonGround mobile apps.
 *
 * This package provides real Daily.co video calling functionality.
 * Requires a development build with native modules.
 *
 * For Expo Go testing, import from './stubs' instead.
 */

// Types (always export - no native dependency)
export type {
  CallState,
  CallSession,
  CallParticipant,
  ParticipantType,
  IncomingCall,
  CallOptions,
  DailyCallState,
  DailyCallActions,
  DailyCallContext,
} from './types';

// Export real implementations for production builds
export { DailyCallProvider, useDailyCall } from './DailyCallProvider';
export { VideoView, CallControls } from './components';

// Also export stubs for Expo Go development
export * as stubs from './DailyCallProvider.stub';
export * as stubComponents from './components/stubs';
