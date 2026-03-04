"""Pydantic schemas for request/response validation."""

from app.schemas.court_form import (
    # Form Submission
    CourtFormSubmissionBase,
    CourtFormSubmissionCreate,
    CourtFormSubmissionUpdate,
    CourtFormSubmissionResponse,
    CourtFormSubmissionSummary,
    # Form Actions
    FormSubmitRequest,
    FormApproveRequest,
    FormRejectRequest,
    FormResubmitRequest,
    FormMarkServedRequest,
    # FL-300
    FL300FormData,
    FL300CreateRequest,
    # FL-311
    FL311FormData,
    FL311CreateRequest,
    # FL-320
    FL320FormData,
    FL320CreateRequest,
    # FL-340
    FL340FormData,
    FL340CreateRequest,
    # FL-341
    FL341FormData,
    FL341CreateRequest,
    # FL-342
    FL342FormData,
    FL342CreateRequest,
    # Requirements
    CaseFormRequirementCreate,
    CaseFormRequirementResponse,
    # Proof of Service
    ProofOfServiceCreate,
    ProofOfServiceResponse,
    ProofOfServiceFileRequest,
    # Hearings
    CourtHearingBase,
    CourtHearingCreate,
    CourtHearingUpdate,
    CourtHearingResponse,
    CourtHearingOutcomeRequest,
    CourtHearingContinueRequest,
    # Respondent Access
    RespondentAccessCodeCreate,
    RespondentAccessCodeResponse,
    RespondentVerifyRequest,
    RespondentVerifyResponse,
    # Progress
    CaseFormProgress,
    CaseActivationRequest,
    # PDF Upload
    FormPDFUploadRequest,
    FormPDFUploadResponse,
    FormExtractionStatusResponse,
    # Lists
    CaseFormsListResponse,
    FormRequirementsListResponse,
)

__all__ = [
    # Form Submission
    "CourtFormSubmissionBase",
    "CourtFormSubmissionCreate",
    "CourtFormSubmissionUpdate",
    "CourtFormSubmissionResponse",
    "CourtFormSubmissionSummary",
    # Form Actions
    "FormSubmitRequest",
    "FormApproveRequest",
    "FormRejectRequest",
    "FormResubmitRequest",
    "FormMarkServedRequest",
    # FL-300
    "FL300FormData",
    "FL300CreateRequest",
    # FL-311
    "FL311FormData",
    "FL311CreateRequest",
    # FL-320
    "FL320FormData",
    "FL320CreateRequest",
    # FL-340
    "FL340FormData",
    "FL340CreateRequest",
    # FL-341
    "FL341FormData",
    "FL341CreateRequest",
    # FL-342
    "FL342FormData",
    "FL342CreateRequest",
    # Requirements
    "CaseFormRequirementCreate",
    "CaseFormRequirementResponse",
    # Proof of Service
    "ProofOfServiceCreate",
    "ProofOfServiceResponse",
    "ProofOfServiceFileRequest",
    # Hearings
    "CourtHearingBase",
    "CourtHearingCreate",
    "CourtHearingUpdate",
    "CourtHearingResponse",
    "CourtHearingOutcomeRequest",
    "CourtHearingContinueRequest",
    # Respondent Access
    "RespondentAccessCodeCreate",
    "RespondentAccessCodeResponse",
    "RespondentVerifyRequest",
    "RespondentVerifyResponse",
    # Progress
    "CaseFormProgress",
    "CaseActivationRequest",
    # PDF Upload
    "FormPDFUploadRequest",
    "FormPDFUploadResponse",
    "FormExtractionStatusResponse",
    # Lists
    "CaseFormsListResponse",
    "FormRequirementsListResponse",
]
