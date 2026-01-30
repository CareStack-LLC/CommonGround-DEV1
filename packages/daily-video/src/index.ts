/**
 * @commonground/daily-video
 *
 * Shared Daily.co video calling package for CommonGround mobile apps.
 *
 * For Expo Go: uses stub implementations (video calls won't work)
 * For dev builds: uses real Daily.co SDK
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

// Always export stubs - they work everywhere
// Apps should use these for Expo Go compatibility
export {
  DailyCallProvider,
  useDailyCall,
} from './DailyCallProvider.stub';

export {
  VideoView,
  CallControls,
} from './components/stubs';
