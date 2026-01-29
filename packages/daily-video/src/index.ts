/**
 * @commonground/daily-video
 *
 * Shared Daily.co video calling package for CommonGround mobile apps.
 *
 * NOTE: Full video calling requires a development build with native modules.
 * In Expo Go, stub implementations are provided.
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

// Export stub implementations that work in Expo Go
// For real video calling, a development build is required
export { DailyCallProvider, useDailyCall } from './DailyCallProvider.stub';
export { VideoView, CallControls } from './components/stubs';
