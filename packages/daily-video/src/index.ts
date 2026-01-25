/**
 * @commonground/daily-video
 *
 * Shared Daily.co video calling package for CommonGround mobile apps.
 * Provides React Native components and hooks for video calling.
 *
 * @example
 * // Setup in app root
 * import { DailyCallProvider } from '@commonground/daily-video';
 * import { video } from '@commonground/api-client';
 *
 * function App() {
 *   return (
 *     <DailyCallProvider userType="parent" videoAPI={video}>
 *       <YourApp />
 *     </DailyCallProvider>
 *   );
 * }
 *
 * @example
 * // Using in a call screen
 * import { useDailyCall, VideoView, CallControls } from '@commonground/daily-video';
 *
 * function CallScreen() {
 *   const { callState, participants, localParticipant, initiateCall, endCall } = useDailyCall();
 *
 *   return (
 *     <View>
 *       {participants.map(p => (
 *         <VideoView key={p.id} participant={p} />
 *       ))}
 *       {localParticipant && (
 *         <VideoView participant={localParticipant} mirror />
 *       )}
 *       <CallControls />
 *     </View>
 *   );
 * }
 */

// Types
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

// Provider and hook
export { DailyCallProvider, useDailyCall } from './DailyCallProvider';

// Components
export { VideoView, CallControls } from './components';
