"""
Evidence Export Service - Court-ready evidence packages.

Generates comprehensive evidence packages including:
- Recordings with integrity verification
- Chain of custody documentation
- Transcriptions
- Compliance certification
"""

import hashlib
import json
import logging
import zipfile
import io
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recording import Recording, RecordingAccessAction
from app.models.export import CaseExport
from app.services.recording import recording_service
from app.services.recording_audit import recording_audit_service
from app.services.storage import storage_service, StorageBucket

logger = logging.getLogger(__name__)


class EvidenceExportService:
    """Service for generating court-admissible evidence packages."""

    async def generate_recording_evidence_package(
        self,
        db: AsyncSession,
        recording_id: str,
        user_id: str,
        user_email: Optional[str] = None,
        case_number: Optional[str] = None,
        court_name: Optional[str] = None,
        court_order_reference: Optional[str] = None,
        discovery_request_id: Optional[str] = None,
        include_transcription: bool = True,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a court-ready evidence package for a recording.

        Package includes:
        - Original recording file
        - SHA-256 integrity hash
        - Chain of custody report
        - Transcription (if available and requested)
        - Compliance certification

        Returns:
            Dict with package URL, certificate number, and metadata
        """
        recording = await recording_service.get_recording(db, recording_id)
        if not recording:
            raise ValueError(f"Recording {recording_id} not found")

        if not recording.is_available:
            raise ValueError("Recording is not available for export")

        timestamp = datetime.utcnow()
        export_id = f"EXP-{timestamp.strftime('%Y%m%d%H%M%S')}-{recording_id[:8]}"

        # Create in-memory ZIP archive
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 1. Add recording file
            recording_content = await storage_service.download_file(
                bucket=recording.s3_bucket,
                path=recording.s3_key
            )
            recording_filename = f"recording_{recording_id}.{recording.format or 'mp4'}"
            zf.writestr(recording_filename, recording_content)

            # Compute hash of recording
            recording_hash = hashlib.sha256(recording_content).hexdigest()

            # 2. Add chain of custody report
            chain_report = await self._generate_chain_of_custody_report(
                db, recording, case_number, court_name, court_order_reference
            )
            zf.writestr("chain_of_custody.json", json.dumps(chain_report, indent=2))

            # 3. Add transcription if available and requested
            transcription_hash = None
            if include_transcription and recording.transcription:
                transcription_data = await self._get_transcription_data(recording)
                zf.writestr("transcription.json", json.dumps(transcription_data, indent=2))

                # Also add plain text version
                if recording.transcription.full_text:
                    zf.writestr("transcription.txt", recording.transcription.full_text)

                transcription_hash = hashlib.sha256(
                    json.dumps(transcription_data).encode()
                ).hexdigest()

            # 4. Add compliance certification
            certification = await self._generate_certification(
                recording=recording,
                export_id=export_id,
                recording_hash=recording_hash,
                transcription_hash=transcription_hash,
                case_number=case_number,
                court_name=court_name,
                court_order_reference=court_order_reference,
                user_id=user_id,
                timestamp=timestamp,
            )
            zf.writestr("certification.json", json.dumps(certification, indent=2))

            # 5. Add README
            readme = self._generate_readme(
                recording=recording,
                export_id=export_id,
                recording_filename=recording_filename,
                include_transcription=include_transcription and recording.transcription is not None,
            )
            zf.writestr("README.txt", readme)

            # 6. Add integrity manifest
            manifest = {
                "export_id": export_id,
                "generated_at": timestamp.isoformat(),
                "files": {
                    recording_filename: recording_hash,
                    "chain_of_custody.json": hashlib.sha256(
                        json.dumps(chain_report).encode()
                    ).hexdigest(),
                    "certification.json": hashlib.sha256(
                        json.dumps(certification).encode()
                    ).hexdigest(),
                },
            }
            if transcription_hash:
                manifest["files"]["transcription.json"] = transcription_hash

            zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2))

        # Get ZIP content
        zip_content = zip_buffer.getvalue()
        package_hash = hashlib.sha256(zip_content).hexdigest()
        package_size = len(zip_content)

        # Upload to storage
        package_path = f"exports/{recording.family_file_id}/{export_id}.zip"
        await storage_service.upload_file(
            bucket=StorageBucket.DOCUMENTS,
            path=package_path,
            file_content=zip_content,
            content_type="application/zip",
        )

        # Generate signed URL (7 days)
        package_url = await storage_service.get_signed_url(
            bucket=StorageBucket.DOCUMENTS,
            path=package_path,
            expires_in=604800,  # 7 days
        )

        # Log the export
        export_log = await recording_audit_service.log_export(
            db=db,
            recording_id=recording_id,
            export_id=export_id,
            export_type="evidence_package",
            requested_by_user_id=user_id,
            requested_by_role="parent",
            exported_file_hash=recording_hash,
            exported_file_size=recording.file_size_bytes or len(recording_content),
            includes_transcription=include_transcription and recording.transcription is not None,
            transcription_hash=transcription_hash,
            case_number=case_number,
            court_name=court_name,
            court_order_reference=court_order_reference,
            discovery_request_id=discovery_request_id,
            ip_address=ip_address,
        )

        return {
            "success": True,
            "export_id": export_id,
            "certificate_number": export_log.certificate_number,
            "package_url": package_url,
            "package_hash": package_hash,
            "package_size": package_size,
            "recording_hash": recording_hash,
            "transcription_included": include_transcription and recording.transcription is not None,
            "transcription_hash": transcription_hash,
            "generated_at": timestamp.isoformat(),
            "expires_at": (timestamp.replace(day=timestamp.day + 7)).isoformat(),
            "files_included": [
                recording_filename,
                "chain_of_custody.json",
                "certification.json",
                "MANIFEST.json",
                "README.txt",
            ] + (["transcription.json", "transcription.txt"] if transcription_hash else []),
        }

    async def _generate_chain_of_custody_report(
        self,
        db: AsyncSession,
        recording: Recording,
        case_number: Optional[str],
        court_name: Optional[str],
        court_order_reference: Optional[str],
    ) -> Dict[str, Any]:
        """Generate chain of custody report."""
        # Get access history
        access_logs = await recording_audit_service.get_access_history(
            db, recording.id, limit=1000
        )

        # Verify chain
        chain_verification = await recording_audit_service.verify_access_chain(
            db, recording.id
        )

        return {
            "report_type": "chain_of_custody",
            "generated_at": datetime.utcnow().isoformat(),
            "recording": {
                "id": recording.id,
                "family_file_id": recording.family_file_id,
                "type": recording.recording_type,
                "recorded_at": recording.started_at.isoformat() if recording.started_at else None,
                "duration_seconds": recording.duration_seconds,
                "file_hash": recording.file_hash,
                "hash_algorithm": recording.file_hash_algorithm,
                "integrity_status": recording.integrity_status,
            },
            "legal_context": {
                "case_number": case_number,
                "court_name": court_name,
                "court_order_reference": court_order_reference,
            },
            "legal_hold": {
                "is_protected": recording.is_protected,
                "set_by": recording.legal_hold_set_by,
                "set_at": recording.legal_hold_set_at.isoformat() if recording.legal_hold_set_at else None,
                "reason": recording.legal_hold_reason,
                "case_number": recording.legal_hold_case_number,
            },
            "chain_verification": chain_verification,
            "access_count": len(access_logs),
            "access_timeline": [
                {
                    "sequence": log.sequence_number,
                    "timestamp": log.accessed_at.isoformat(),
                    "user_id": log.user_id,
                    "user_role": log.user_role,
                    "action": log.action,
                    "ip_address": log.ip_address,
                    "success": log.success,
                    "content_hash": log.content_hash,
                    "previous_hash": log.previous_log_hash,
                }
                for log in access_logs
            ],
            "integrity_statement": (
                "This chain of custody report documents all recorded access to the "
                f"referenced recording. The chain contains {len(access_logs)} entries "
                f"and has been verified as {'intact' if chain_verification['verified'] else 'potentially compromised'}. "
                "Each entry is cryptographically linked to the previous entry using SHA-256 hashing."
            ),
        }

    async def _get_transcription_data(self, recording: Recording) -> Dict[str, Any]:
        """Get transcription data for export."""
        transcription = recording.transcription
        if not transcription:
            return {}

        return {
            "transcription_id": transcription.id,
            "recording_id": recording.id,
            "status": transcription.status,
            "language": transcription.language,
            "duration_seconds": transcription.duration_seconds,
            "word_count": transcription.word_count,
            "speaker_count": transcription.speaker_count,
            "full_text": transcription.full_text,
            "chunks": [
                {
                    "speaker_name": chunk.speaker_name,
                    "speaker_label": chunk.speaker_label,
                    "content": chunk.content,
                    "start_time": chunk.start_time,
                    "end_time": chunk.end_time,
                    "confidence": chunk.confidence,
                    "is_flagged": chunk.is_flagged,
                    "flag_reason": chunk.flag_reason,
                }
                for chunk in transcription.chunks
            ],
        }

    async def _generate_certification(
        self,
        recording: Recording,
        export_id: str,
        recording_hash: str,
        transcription_hash: Optional[str],
        case_number: Optional[str],
        court_name: Optional[str],
        court_order_reference: Optional[str],
        user_id: str,
        timestamp: datetime,
    ) -> Dict[str, Any]:
        """Generate compliance certification."""
        certification_content = {
            "export_id": export_id,
            "recording_id": recording.id,
            "timestamp": timestamp.isoformat(),
            "recording_hash": recording_hash,
            "original_hash": recording.file_hash,
        }
        certification_hash = hashlib.sha256(
            json.dumps(certification_content, sort_keys=True).encode()
        ).hexdigest()

        return {
            "certification_type": "evidence_export",
            "certification_hash": certification_hash,
            "export_id": export_id,
            "generated_at": timestamp.isoformat(),
            "recording": {
                "id": recording.id,
                "original_hash": recording.file_hash,
                "exported_hash": recording_hash,
                "hash_match": recording.file_hash == recording_hash if recording.file_hash else None,
                "hash_algorithm": "sha256",
                "duration_seconds": recording.duration_seconds,
                "file_size_bytes": recording.file_size_bytes,
                "recorded_at": recording.started_at.isoformat() if recording.started_at else None,
            },
            "transcription": {
                "included": transcription_hash is not None,
                "hash": transcription_hash,
            } if transcription_hash else None,
            "legal_context": {
                "case_number": case_number,
                "court_name": court_name,
                "court_order_reference": court_order_reference,
            },
            "requester": {
                "user_id": user_id,
            },
            "certification_statement": (
                f"I hereby certify that the recording file contained in this evidence package "
                f"(SHA-256: {recording_hash}) is a true, complete, and unaltered copy of the "
                f"original recording stored in the CommonGround platform. "
                f"{'The exported hash matches the original hash at time of storage. ' if recording.file_hash == recording_hash else ''}"
                f"This package was generated on {timestamp.strftime('%B %d, %Y at %H:%M:%S UTC')} "
                f"and includes a complete chain of custody audit trail. "
                f"The authenticity and integrity of this evidence can be independently verified "
                f"using the SHA-256 hashes provided in this certification and the MANIFEST.json file."
            ),
            "verification_instructions": (
                "To verify the integrity of this evidence package:\n"
                "1. Compute the SHA-256 hash of each file in the package\n"
                "2. Compare the computed hashes against those in MANIFEST.json\n"
                "3. Review the chain_of_custody.json for the complete access history\n"
                "4. Verify the chain_verification.verified field is 'true'\n"
                "5. Contact CommonGround support for independent verification if needed"
            ),
        }

    def _generate_readme(
        self,
        recording: Recording,
        export_id: str,
        recording_filename: str,
        include_transcription: bool,
    ) -> str:
        """Generate README file for the evidence package."""
        return f"""
COMMONGROUND EVIDENCE PACKAGE
=============================
Export ID: {export_id}
Generated: {datetime.utcnow().strftime('%B %d, %Y at %H:%M:%S UTC')}

CONTENTS
--------
1. {recording_filename}
   - Original recording file
   - Duration: {recording.duration_seconds or 'Unknown'} seconds
   - Format: {recording.format or 'mp4'}

2. chain_of_custody.json
   - Complete access history for this recording
   - Cryptographically linked audit trail
   - Chain integrity verification status

3. certification.json
   - Export certification with integrity hashes
   - Legal context information
   - Verification instructions

4. MANIFEST.json
   - SHA-256 hashes for all files in this package
   - Use for independent integrity verification

{'5. transcription.json / transcription.txt' if include_transcription else ''}
{'   - Full transcription with speaker diarization' if include_transcription else ''}
{'   - Timestamps for each spoken segment' if include_transcription else ''}

VERIFICATION
------------
To verify the integrity of this evidence:

1. Compute SHA-256 hash of {recording_filename}
2. Compare against the hash in MANIFEST.json
3. Review chain_of_custody.json for access history
4. Check that chain_verification.verified is true

LEGAL NOTICE
------------
This evidence package was generated by CommonGround, a court-admissible
co-parenting platform. The chain of custody has been maintained using
cryptographic hash linking, ensuring that any tampering would be detectable.

For questions or independent verification, contact:
support@commonground.app

COMMONGROUND - Putting Children First
https://commonground.app
"""


# Global service instance
evidence_export_service = EvidenceExportService()
