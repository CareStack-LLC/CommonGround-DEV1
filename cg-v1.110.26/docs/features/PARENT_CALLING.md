# Parent-to-Parent Calling Feature

**Status**: ✅ Implemented (v1.110.26)
**Feature Type**: Communication
**Dependencies**: Daily.co, ARIA Monitoring, Message Attachments

## Overview

Parent-to-parent video and audio calling system with ARIA monitoring, permanent rooms per family file, and approval-gated access.

## Key Features

### 1. Permanent Daily.co Rooms

- **One room per family file** (permanent, not on-demand)
- Room naming: `cg-parent-{family_file_number}`
- 1-year room expiration (Daily.co default)
- Auto-created when family file is created
- Idempotent room management

### 2. Call Types

- **Video calls**: Full video + audio
- **Audio calls**: Audio-only mode

### 3. Approval-Gated Calling

**Requirement**: Both parents must join the family file before calling is enabled.

**Before Parent B joins:**
- Call buttons disabled (greyed out)
- Only messaging available
- Backend rejects call attempts with 400 error

**After Parent B joins:**
- Call buttons enabled
- Video/audio calling works
- Uses family file's permanent room

### 4. ARIA Monitoring

**Hybrid Approach:**

1. **Real-time Analysis** (during call):
   - Quick SEVERE violation detection
   - Regex + Claude fast analysis
   - WebSocket warnings to both parents
   - Can terminate calls for safety

2. **Post-call Analysis**:
   - Comprehensive transcript review
   - Full ARIA pipeline (all 14 categories)
   - Court-ready reports
   - Intervention timeline

**Intervention Levels:**
- **LOW/MEDIUM**: Logged only
- **HIGH**: Visual warning overlay
- **SEVERE**: Warning + possible termination (10-second countdown)

### 5. Recording & Transcription

- **All calls recorded** (automatically)
- **Real-time transcription** via Daily.co
- Recordings stored in Supabase Storage
- SHA-256 hash for court integrity
- Permanent storage (immutable)

### 6. Message Attachments

**Supported Types:**
- Images (PNG, JPG, etc.)
- Documents (PDF, DOC, DOCX)
- Audio files
- Video files

**Limits:**
- Max file size: **150 MB** per attachment
- Virus scanning integration
- SHA-256 hashing for integrity

## Database Schema

### ParentCallRoom
```sql
CREATE TABLE parent_call_rooms (
    id UUID PRIMARY KEY,
    family_file_id UUID UNIQUE NOT NULL,  -- 1:1 relationship
    daily_room_name VARCHAR NOT NULL,
    daily_room_url VARCHAR NOT NULL,
    recording_enabled BOOLEAN DEFAULT TRUE,
    aria_monitoring_enabled BOOLEAN DEFAULT TRUE,
    max_duration_minutes INTEGER DEFAULT 120,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### ParentCallSession
```sql
CREATE TABLE parent_call_sessions (
    id UUID PRIMARY KEY,
    family_file_id UUID NOT NULL,
    room_id UUID NOT NULL,
    parent_a_id UUID NOT NULL,
    parent_b_id UUID,
    call_type VARCHAR NOT NULL,  -- 'video' | 'audio'
    status VARCHAR NOT NULL,      -- 'ringing' | 'active' | 'completed' | 'missed' | 'cancelled'
    daily_room_name VARCHAR NOT NULL,
    daily_room_url VARCHAR NOT NULL,
    parent_a_token VARCHAR,
    parent_b_token VARCHAR,
    initiated_by UUID NOT NULL,
    initiated_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    recording_enabled BOOLEAN DEFAULT TRUE,
    recording_url VARCHAR,
    transcript_url VARCHAR,
    aria_active BOOLEAN DEFAULT TRUE,
    aria_intervention_count INTEGER DEFAULT 0,
    aria_terminated_call BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### CallTranscriptChunk
```sql
CREATE TABLE call_transcript_chunks (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    speaker_id UUID NOT NULL,
    content TEXT NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    analyzed BOOLEAN DEFAULT FALSE,
    flagged BOOLEAN DEFAULT FALSE,
    toxicity_score FLOAT
);
```

### CallFlag
```sql
CREATE TABLE call_flags (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    transcript_chunk_id UUID,
    flag_type VARCHAR NOT NULL,  -- 'real_time' | 'post_call'
    toxicity_score FLOAT NOT NULL,
    severity VARCHAR NOT NULL,   -- 'low' | 'medium' | 'high' | 'severe'
    categories JSONB,
    intervention_needed BOOLEAN DEFAULT FALSE,
    intervention_type VARCHAR,   -- 'warning' | 'mute' | 'terminate'
    intervention_message TEXT NOT NULL,
    flagged_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### MessageAttachment
```sql
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    family_file_id UUID NOT NULL,
    file_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,  -- MIME type
    file_size INTEGER NOT NULL,
    file_category VARCHAR NOT NULL,  -- 'image' | 'document' | 'audio' | 'video'
    storage_path VARCHAR NOT NULL,
    storage_url VARCHAR NOT NULL,
    sha256_hash VARCHAR NOT NULL,
    virus_scanned BOOLEAN DEFAULT FALSE,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## API Endpoints

### Call Management

```
POST   /api/v1/parent-calls/
  - Initiate call (creates session, returns room URL + token)
  - Body: { family_file_id, call_type: "video" | "audio" }
  - Returns: { session_id, room_url, token }

POST   /api/v1/parent-calls/{session_id}/join
  - Join existing call (second parent)
  - Body: { user_name }
  - Returns: { room_url, token }

POST   /api/v1/parent-calls/{session_id}/end
  - End call session
  - Returns: { message, session_id, duration_seconds }

POST   /api/v1/parent-calls/{session_id}/transcript-chunk
  - Process transcript chunk (Daily.co webhook)
  - Body: { speaker_id, content, start_time, end_time }
  - Returns: { chunk_id, intervention? }

GET    /api/v1/parent-calls/family-file/{id}/history
  - Get call history
  - Query: limit, offset
  - Returns: CallSessionResponse[]

GET    /api/v1/parent-calls/{session_id}/report
  - Court-ready call report
  - Returns: CallReportResponse (ARIA analysis, recording, transcript)

GET    /api/v1/parent-calls/{session_id}/aria-analysis
  - Detailed ARIA metrics
  - Returns: CallARIAAnalysisResponse
```

### Message Attachments

```
POST   /api/v1/messages/{message_id}/attachments
  - Upload attachment
  - Body: multipart/form-data (file)
  - Returns: MessageAttachment

GET    /api/v1/messages/{message_id}/attachments
  - List attachments
  - Returns: MessageAttachment[]

DELETE /api/v1/messages/attachments/{attachment_id}
  - Delete attachment (uploader only)
  - Returns: { message }
```

## Frontend Components

### Messages Page (`/app/messages/page.tsx`)

**Call Buttons:**
- Phone icon (audio call)
- Video icon (video call)
- Disabled until both parents join
- Tooltip: "Both parents must join before calling"

**Message Attachments:**
- Paperclip button in composer
- File preview before upload
- Attachment display in message bubbles
- Download links for non-image files

### Call Interface (`/app/messages/call/page.tsx`)

**UI Elements:**
- Daily.co iframe (full-screen video)
- ARIA warning overlay (amber/red gradient)
- Call controls (audio, video, end call)
- Call duration timer
- Participant count
- "ARIA Guardian Active" badge

**ARIA Warning Overlay:**
```tsx
{ariaWarning && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
    <div className={`bg-gradient-to-r ${
      ariaWarning.severity === 'severe'
        ? 'from-red-500 to-orange-500'
        : 'from-amber-500 to-orange-500'
    } text-white px-8 py-4 rounded-2xl shadow-2xl animate-pulse`}>
      <AlertTriangle className="h-8 w-8" />
      <p>{ariaWarning.warning_message}</p>
      {ariaWarning.should_terminate && (
        <p>Call will be terminated in {ariaWarning.termination_delay || 10}s</p>
      )}
    </div>
  </div>
)}
```

## Services

### ParentCallService (`/backend/app/services/parent_call.py`)

**Key Methods:**
- `get_or_create_permanent_room()` - Idempotent room creation
- `create_call_session()` - Initiates call (validates parent B joined)
- `join_call()` - Generates token for participant
- `end_call()` - Ends session, triggers post-call processing
- `process_transcript_chunk()` - Stores and analyzes transcript
- `get_family_call_history()` - Retrieves past calls

### ARIACallMonitor (`/backend/app/services/aria_call_monitor.py`)

**Key Methods:**
- `analyze_transcript_chunk_realtime()` - Fast SEVERE detection
- `analyze_full_call_transcript()` - Post-call comprehensive analysis
- `handle_severe_violation()` - Intervention logic (warn/terminate)
- `generate_court_report()` - Court-ready documentation

### DailyVideoService (`/backend/app/services/daily_video.py`)

**Key Methods:**
- `create_room()` - Create Daily.co room
- `generate_meeting_token()` - Create participant token
- `start_recording()` - Start call recording
- `stop_recording()` - Stop call recording
- `start_transcription()` - Enable real-time transcription
- `stop_transcription()` - Disable transcription
- `get_recordings()` - Download completed recordings
- `end_session()` - Forcefully end call (ARIA termination)

## Security & Privacy

### Access Control
- Only family file parents can initiate/join calls
- Both parents must join family file before calling enabled
- Tokens expire after call ends
- Room access controlled by Daily.co meeting tokens

### Data Integrity
- SHA-256 hashing for all recordings
- SHA-256 hashing for all attachments
- Immutable storage (recordings cannot be edited)
- Virus scanning for attachments

### Court Compliance
- All calls recorded by default
- Complete transcript available
- ARIA intervention log with timestamps
- Downloadable evidence packages
- Integrity verification via SHA-256

## Implementation Details

### Permanent Room Creation

**Triggered when**: Family file is created

**Flow**:
1. Family file created (parent A creates, parent B invited)
2. `parent_call_service.get_or_create_permanent_room()` called
3. Check if room already exists for this family file
4. If not, create Daily.co room: `cg-parent-{family_file_number}`
5. Store room in `parent_call_rooms` table
6. Return existing room if already created (idempotent)

### Call Session Flow

**Initiation**:
1. Parent A clicks "Video Call" or "Audio Call" button
2. Frontend validates `parent_b_joined_at` is not NULL
3. POST to `/api/v1/parent-calls/` with `family_file_id` and `call_type`
4. Backend validates both parents joined
5. Backend creates `ParentCallSession` (status: "ringing")
6. Backend generates meeting token for Parent A
7. WebSocket broadcast to Parent B: "incoming_call"
8. Frontend navigates to `/messages/call?family_file_id={id}&call_type={type}`

**Joining**:
1. Parent B sees incoming call notification
2. Parent B clicks "Join"
3. POST to `/api/v1/parent-calls/{session_id}/join`
4. Backend updates session status to "active"
5. Backend generates meeting token for Parent B
6. Both parents connect to Daily.co room
7. Recording and transcription start automatically

**During Call**:
1. Daily.co sends transcript chunks to webhook
2. Chunks stored in `call_transcript_chunks`
3. Real-time ARIA analysis (SEVERE only)
4. If flagged: WebSocket warning to both parents
5. If severe + no improvement: Call terminated after 10s

**Ending**:
1. Either parent clicks "End Call"
2. POST to `/api/v1/parent-calls/{session_id}/end`
3. Backend stops recording/transcription
4. Backend updates session (status: "completed", duration)
5. Background job:
   - Download recording from Daily.co
   - Upload to Supabase Storage
   - Run full ARIA analysis
   - Generate court report
   - Notify both parents

### ARIA Intervention Example

**Real-time Detection**:
```
Parent A: "You're such a terrible mother, I can't believe the kids have to deal with you."

ARIA Analysis:
- Toxicity Score: 0.85
- Categories: ["hostility", "blame", "personal_attack"]
- Severity: SEVERE
- Intervention: WARNING

Action:
1. Create CallFlag record
2. Broadcast WebSocket to both parents:
   {
     "type": "aria_intervention",
     "severity": "severe",
     "message": "Please maintain respectful communication. This language violates our community guidelines.",
     "should_terminate": false
   }
3. Display warning overlay for 10 seconds
```

**Termination Example**:
```
Parent A: "I'm going to make sure you never see the kids again, you worthless piece of..."

ARIA Analysis:
- Toxicity Score: 0.95
- Categories: ["hostility", "threat", "profanity"]
- Severity: SEVERE
- Intervention: TERMINATE

Action:
1. Create CallFlag record (intervention_type: "terminate")
2. Broadcast WebSocket:
   {
     "type": "aria_intervention",
     "severity": "severe",
     "message": "SEVERE VIOLATION: Direct threats and extreme hostility detected. Call will be terminated in 10 seconds.",
     "should_terminate": true,
     "termination_delay": 10
   }
3. Display red warning overlay with countdown
4. After 10 seconds: Call `daily_service.end_session(room_name)`
5. Redirect both parents to messages page
6. Generate termination report for court
```

## Testing

### Test File: `/backend/tests/test_parent_call_approval.py`

**Test Scenarios**:
1. ✅ Create family file (only parent A)
2. ✅ Verify only 1 Daily.co room created
3. ✅ Verify idempotency (multiple calls return same room)
4. ✅ Verify call fails when parent B not joined
5. ✅ Parent B joins
6. ✅ Verify call succeeds after both joined
7. ✅ Create second family file
8. ✅ Verify each family file has unique room
9. ✅ Verify room isolation

**Run Tests**:
```bash
cd backend
python tests/test_parent_call_approval.py
```

## Configuration

### Environment Variables

```bash
# Daily.co
DAILY_API_KEY=your_daily_api_key
DAILY_DOMAIN=your_domain.daily.co

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ARIA
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# API
API_URL=http://localhost:8000  # or production URL
```

### Feature Flags

None - feature is always enabled for all family files.

## Future Enhancements

### Short-term
- [ ] Screen sharing capability
- [ ] Call recording download UI
- [ ] ARIA sensitivity settings per case
- [ ] Mobile app support

### Long-term
- [ ] Group calls (include lawyers, mediators)
- [ ] Scheduled calls (calendar integration)
- [ ] Call quality metrics
- [ ] Emergency contact notification
- [ ] Live translation for multilingual families

## Migration Notes

**Migration**: `alembic/versions/xxx_add_parent_calling.py`

Created tables:
- `parent_call_rooms`
- `parent_call_sessions`
- `call_transcript_chunks`
- `call_flags`
- `message_attachments`

**Rollback**: Safe - no existing data affected (new tables only)

## Support & Troubleshooting

### Common Issues

**Issue**: Call buttons disabled even after both parents joined
**Fix**: Verify `parent_b_joined_at` is set in database

**Issue**: Daily.co room already exists error
**Fix**: Room creation is idempotent - check if room already in DB

**Issue**: Recording not available
**Fix**: Wait 30 seconds after call ends for Daily.co processing

**Issue**: ARIA not analyzing call
**Fix**: Verify `aria_active` is TRUE in session, check ANTHROPIC_API_KEY

## Related Features

- **ARIA Sentiment Shield** - Message mediation
- **Message Attachments** - File sharing in chat
- **KidComs** - Child communication system
- **Schedule** - Parenting time coordination

## Version History

- **v1.110.26** (2026-01-23): Initial implementation
  - Permanent rooms per family file
  - Approval-gated calling
  - ARIA monitoring (hybrid)
  - Recording & transcription
  - Message attachments (150MB limit)
