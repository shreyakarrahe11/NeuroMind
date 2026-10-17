
import uuid
from datetime import datetime, date, timezone
from enum import Enum
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, Boolean, Date, DateTime, ForeignKey, JSON, Index, UniqueConstraint, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from ..core.database import Base

UUIDType=Uuid(as_uuid=True)

class UserRole(str,Enum): PATIENT="PATIENT"; DOCTOR="DOCTOR"; ADMIN="ADMIN"
class AccountStatus(str,Enum): PENDING="PENDING"; ACTIVE="ACTIVE"; SUSPENDED="SUSPENDED"; DEACTIVATED="DEACTIVATED"
class AssessmentStatus(str,Enum): DRAFT="DRAFT"; IN_PROGRESS="IN_PROGRESS"; COMPLETED="COMPLETED"; PROCESSING="PROCESSING"; PROCESSED="PROCESSED"; FAILED="FAILED"; CANCELLED="CANCELLED"
class JobStatus(str,Enum): QUEUED="QUEUED"; PROCESSING="PROCESSING"; COMPLETED="COMPLETED"; FAILED="FAILED"; PENDING_MODEL="PENDING_MODEL"
class ReportStatus(str,Enum): GENERATING="GENERATING"; GENERATED="GENERATED"; REVIEWED="REVIEWED"; FINALIZED="FINALIZED"; FAILED="FAILED"; PENDING_MODEL="PENDING_MODEL"
class RiskLevel(str,Enum): LOW="LOW"; MEDIUM="MEDIUM"; HIGH="HIGH"

def uid(): return uuid.uuid4()
def now(): return datetime.now(timezone.utc)

class User(Base):
    __tablename__="users"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    email:Mapped[str]=mapped_column(String(255),unique=True,index=True,nullable=False)
    password_hash:Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    auth_provider:Mapped[str]=mapped_column(String(20),default="local",index=True)
    clerk_user_id:Mapped[Optional[str]]=mapped_column(String(255),unique=True,index=True,nullable=True)
    account_status:Mapped[AccountStatus]=mapped_column(String(30),default=AccountStatus.ACTIVE,index=True)
    role:Mapped[UserRole]=mapped_column(String(20),default=UserRole.PATIENT,index=True)
    first_name:Mapped[str]=mapped_column(String(120),default="")
    last_name:Mapped[str]=mapped_column(String(120),default="")
    phone:Mapped[Optional[str]]=mapped_column(String(50),nullable=True)
    is_active:Mapped[bool]=mapped_column(Boolean,default=True)
    is_verified:Mapped[bool]=mapped_column(Boolean,default=False)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    last_login_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True,index=True)
    last_logout_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)
    token_version:Mapped[int]=mapped_column(Integer,default=0,nullable=False)
    patient_profile=relationship("PatientProfile",back_populates="user",uselist=False,cascade="all, delete-orphan")
    doctor_profile=relationship("DoctorProfile",back_populates="user",uselist=False,cascade="all, delete-orphan")

class PatientProfile(Base):
    __tablename__="patient_profiles"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    user_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("users.id",ondelete="CASCADE"),unique=True,index=True)
    date_of_birth:Mapped[Optional[date]]=mapped_column(Date,nullable=True)
    gender:Mapped[Optional[str]]=mapped_column(String(50),nullable=True)
    occupation:Mapped[Optional[str]]=mapped_column(String(255),nullable=True)
    education_level:Mapped[Optional[str]]=mapped_column(String(255),nullable=True)
    preferred_language:Mapped[Optional[str]]=mapped_column(String(50),default="English")
    emergency_contact:Mapped[Optional[str]]=mapped_column(String(255),nullable=True)
    doctor_assignment_requested_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True,index=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    user=relationship("User",back_populates="patient_profile")
    assessments=relationship("AssessmentSession",back_populates="patient",cascade="all, delete-orphan")

class DoctorProfile(Base):
    __tablename__="doctor_profiles"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    user_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("users.id",ondelete="CASCADE"),unique=True,index=True)
    doctor_code:Mapped[str]=mapped_column(String(80),unique=True,index=True)
    specialization:Mapped[str]=mapped_column(String(255),default="")
    qualification:Mapped[str]=mapped_column(String(255),default="")
    license_number:Mapped[str]=mapped_column(String(100),unique=True)
    hospital_clinic:Mapped[str]=mapped_column(String(255),default="")
    years_of_experience:Mapped[Optional[int]]=mapped_column(Integer,nullable=True)
    bio:Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    city:Mapped[Optional[str]]=mapped_column(String(120),nullable=True,index=True)
    area:Mapped[Optional[str]]=mapped_column(String(120),nullable=True)
    is_approved:Mapped[bool]=mapped_column(Boolean,default=False,index=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    user=relationship("User",back_populates="doctor_profile")

class Assignment(Base):
    __tablename__="doctor_patient_assignments"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    doctor_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("doctor_profiles.id",ondelete="CASCADE"),index=True)
    patient_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("patient_profiles.id",ondelete="CASCADE"),index=True)
    assigned_by:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("users.id"))
    status:Mapped[str]=mapped_column(String(20),default="ACTIVE",index=True)
    assigned_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    unassigned_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)
    __table_args__=(
        Index("ix_active_assignment","doctor_id","patient_id","status"),
        Index("uq_active_patient_assignment", "patient_id", unique=True, postgresql_where=(status == "ACTIVE"), sqlite_where=(status == "ACTIVE")),
    )

class AssessmentSession(Base):
    __tablename__="assessment_sessions"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    patient_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("patient_profiles.id",ondelete="CASCADE"),index=True)
    status:Mapped[AssessmentStatus]=mapped_column(String(30),default=AssessmentStatus.DRAFT,index=True)
    current_step:Mapped[str]=mapped_column(String(50),default="overview")
    started_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    completed_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    patient=relationship("PatientProfile",back_populates="assessments")
    speech=relationship("SpeechAssessment",back_populates="session",uselist=False,cascade="all, delete-orphan")
    memory=relationship("MemoryAssessment",back_populates="session",uselist=False,cascade="all, delete-orphan")
    attention=relationship("AttentionAssessment",back_populates="session",uselist=False,cascade="all, delete-orphan")
    lifestyle=relationship("LifestyleAssessment",back_populates="session",uselist=False,cascade="all, delete-orphan")
    model_runs=relationship("ModelRun",back_populates="session",cascade="all, delete-orphan")
    predictions=relationship("Prediction",back_populates="session",cascade="all, delete-orphan")
    report=relationship("Report",back_populates="session",uselist=False,cascade="all, delete-orphan")

class SpeechAssessment(Base):
    __tablename__="speech_assessments"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),unique=True)
    audio_file_path:Mapped[str]=mapped_column(Text)
    original_filename:Mapped[str]=mapped_column(String(255),default="speech.wav")
    audio_format:Mapped[str]=mapped_column(String(20),default="wav")
    prompt_id:Mapped[Optional[str]]=mapped_column(String(120),nullable=True)
    prompt_type:Mapped[Optional[str]]=mapped_column(String(40),nullable=True)
    duration_seconds:Mapped[Optional[float]]=mapped_column(Float,nullable=True)
    sample_rate:Mapped[Optional[int]]=mapped_column(Integer,nullable=True)
    preprocessing_status:Mapped[str]=mapped_column(String(30),default="PENDING")
    feature_extraction_status:Mapped[str]=mapped_column(String(30),default="PENDING")
    transcription_status:Mapped[str]=mapped_column(String(30),default="NOT_REQUIRED")
    processing_error_code:Mapped[Optional[str]]=mapped_column(String(80),nullable=True)
    speech_artifact_sha256:Mapped[Optional[str]]=mapped_column(String(64),nullable=True)
    uploaded_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    session=relationship("AssessmentSession",back_populates="speech")
    features=relationship("SpeechFeature",back_populates="speech_assessment",cascade="all, delete-orphan")
    transcription=relationship("SpeechTranscription",back_populates="speech_assessment",uselist=False,cascade="all, delete-orphan")
    audio_blob=relationship("SpeechAudioBlob",back_populates="speech_assessment",uselist=False,cascade="all, delete-orphan")

class SpeechAudioBlob(Base):
    """Original uploaded recording, stored separately to keep routine queries small."""
    __tablename__="speech_audio_blobs"
    speech_assessment_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("speech_assessments.id",ondelete="CASCADE"),primary_key=True)
    content:Mapped[bytes]=mapped_column(LargeBinary,nullable=False,deferred=True)
    content_type:Mapped[str]=mapped_column(String(120),nullable=False)
    byte_size:Mapped[int]=mapped_column(Integer,nullable=False)
    sha256:Mapped[str]=mapped_column(String(64),nullable=False)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    speech_assessment=relationship("SpeechAssessment",back_populates="audio_blob")

class SpeechFeature(Base):
    __tablename__="speech_features"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    speech_assessment_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("speech_assessments.id",ondelete="CASCADE"),index=True)
    feature_name:Mapped[str]=mapped_column(String(120)); feature_value:Mapped[float]=mapped_column(Float); feature_group:Mapped[Optional[str]]=mapped_column(String(80),nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    speech_assessment=relationship("SpeechAssessment",back_populates="features")

class SpeechTranscription(Base):
    __tablename__="speech_transcriptions"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    speech_assessment_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("speech_assessments.id",ondelete="CASCADE"),unique=True)
    transcript:Mapped[str]=mapped_column(Text,default=""); language:Mapped[str]=mapped_column(String(30),default="en")
    model_name:Mapped[str]=mapped_column(String(120)); confidence_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    speech_assessment=relationship("SpeechAssessment",back_populates="transcription")

class MemoryAssessment(Base):
    __tablename__="memory_assessments"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),unique=True)
    memory_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); immediate_recall:Mapped[Optional[float]]=mapped_column(Float,nullable=True); delayed_recall:Mapped[Optional[float]]=mapped_column(Float,nullable=True); recognition_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); raw_response_json:Mapped[dict]=mapped_column(JSON,default=dict)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    session=relationship("AssessmentSession",back_populates="memory")

class AttentionAssessment(Base):
    __tablename__="attention_assessments"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),unique=True)
    attention_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); reaction_time:Mapped[Optional[float]]=mapped_column(Float,nullable=True); accuracy:Mapped[Optional[float]]=mapped_column(Float,nullable=True); errors:Mapped[Optional[int]]=mapped_column(Integer,nullable=True); completion_time:Mapped[Optional[float]]=mapped_column(Float,nullable=True); raw_response_json:Mapped[dict]=mapped_column(JSON,default=dict)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    session=relationship("AssessmentSession",back_populates="attention")

class LifestyleAssessment(Base):
    __tablename__="lifestyle_assessments"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),unique=True)
    sleep_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); physical_activity_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); social_activity_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); diet_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); smoking_status:Mapped[Optional[str]]=mapped_column(String(30),nullable=True); alcohol_status:Mapped[Optional[str]]=mapped_column(String(30),nullable=True); stress_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); overall_lifestyle_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); responses_json:Mapped[dict]=mapped_column(JSON,default=dict)
    completed_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    session=relationship("AssessmentSession",back_populates="lifestyle")

class ModelArtifact(Base):
    __tablename__ = "model_artifacts"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160), index=True)
    version: Mapped[str] = mapped_column(String(80), index=True)
    task: Mapped[str] = mapped_column(String(160), index=True)
    framework: Mapped[str] = mapped_column(String(80))
    artifact_path: Mapped[str] = mapped_column(Text)
    checksum_sha256: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    input_features_json: Mapped[list] = mapped_column(JSON, default=list)
    class_labels_json: Mapped[list] = mapped_column(JSON, default=list)
    metrics_json: Mapped[dict] = mapped_column(JSON, default=dict)
    manifest_json: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    runs = relationship("ModelRun", back_populates="model_artifact")


class ModelRun(Base):
    __tablename__="model_runs"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),index=True); model_artifact_id:Mapped[Optional[uuid.UUID]]=mapped_column(UUIDType,ForeignKey("model_artifacts.id",ondelete="SET NULL"),nullable=True,index=True)
    model_name:Mapped[str]=mapped_column(String(120)); model_version:Mapped[str]=mapped_column(String(80),default="unknown"); input_type:Mapped[str]=mapped_column(String(80),default="multimodal"); status:Mapped[JobStatus]=mapped_column(String(30),default=JobStatus.QUEUED,index=True)
    started_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True); completed_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True); error_message:Mapped[Optional[str]]=mapped_column(Text,nullable=True); metadata_json:Mapped[dict]=mapped_column(JSON,default=dict)
    session=relationship("AssessmentSession",back_populates="model_runs"); model_artifact=relationship("ModelArtifact",back_populates="runs"); predictions=relationship("Prediction",back_populates="model_run",cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__="predictions"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),index=True); model_run_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("model_runs.id",ondelete="CASCADE"))
    prediction_label:Mapped[str]=mapped_column(String(100)); risk_level:Mapped[RiskLevel]=mapped_column(String(20)); probability:Mapped[float]=mapped_column(Float); confidence_score:Mapped[Optional[float]]=mapped_column(Float,nullable=True); prediction_json:Mapped[dict]=mapped_column(JSON,default=dict); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    session=relationship("AssessmentSession",back_populates="predictions"); model_run=relationship("ModelRun",back_populates="predictions"); explanations=relationship("Explanation",back_populates="prediction",cascade="all, delete-orphan")

class Explanation(Base):
    __tablename__="explanations"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); prediction_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("predictions.id",ondelete="CASCADE"),index=True); method:Mapped[str]=mapped_column(String(50)); feature_name:Mapped[str]=mapped_column(String(160)); feature_value:Mapped[Optional[str]]=mapped_column(Text,nullable=True); importance_value:Mapped[float]=mapped_column(Float); direction:Mapped[Optional[str]]=mapped_column(String(20),nullable=True); explanation_json:Mapped[dict]=mapped_column(JSON,default=dict); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    prediction=relationship("Prediction",back_populates="explanations")

class KnowledgeDocument(Base):
    __tablename__="knowledge_documents"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); title:Mapped[str]=mapped_column(String(500)); source:Mapped[str]=mapped_column(String(255)); document_type:Mapped[str]=mapped_column(String(80)); file_path:Mapped[str]=mapped_column(Text); version:Mapped[Optional[str]]=mapped_column(String(80),nullable=True); publication_date:Mapped[Optional[date]]=mapped_column(Date,nullable=True); metadata_json:Mapped[dict]=mapped_column(JSON,default=dict); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    chunks=relationship("KnowledgeChunk",back_populates="document",cascade="all, delete-orphan")
class KnowledgeChunk(Base):
    __tablename__="knowledge_chunks"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); document_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("knowledge_documents.id",ondelete="CASCADE"),index=True); chunk_text:Mapped[str]=mapped_column(Text); chunk_index:Mapped[int]=mapped_column(Integer); vector_id:Mapped[Optional[str]]=mapped_column(String(255),nullable=True); metadata_json:Mapped[dict]=mapped_column(JSON,default=dict); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    document=relationship("KnowledgeDocument",back_populates="chunks")

class Report(Base):
    __tablename__="reports"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); session_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("assessment_sessions.id",ondelete="CASCADE"),unique=True,index=True); patient_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("patient_profiles.id",ondelete="CASCADE")); prediction_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("predictions.id",ondelete="SET NULL"),nullable=True)
    report_title:Mapped[str]=mapped_column(String(255)); summary:Mapped[str]=mapped_column(Text,default=""); risk_level:Mapped[Optional[RiskLevel]]=mapped_column(String(20),nullable=True); ai_report:Mapped[str]=mapped_column(Text,default=""); evidence_summary:Mapped[str]=mapped_column(Text,default=""); limitations:Mapped[str]=mapped_column(Text,default=""); report_status:Mapped[ReportStatus]=mapped_column(String(30),default=ReportStatus.PENDING_MODEL,index=True); generated_by_model:Mapped[str]=mapped_column(String(120),default="pending"); model_version:Mapped[str]=mapped_column(String(80),default="unknown"); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    session=relationship("AssessmentSession",back_populates="report")
    evidence=relationship("ReportEvidence",back_populates="report",cascade="all, delete-orphan")
    reviews=relationship("DoctorReview",back_populates="report",cascade="all, delete-orphan")
    shares=relationship("ReportShare",back_populates="report",cascade="all, delete-orphan")

class ReportEvidence(Base):
    __tablename__="report_evidence"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); report_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("reports.id",ondelete="CASCADE")); document_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("knowledge_documents.id",ondelete="SET NULL"),nullable=True); chunk_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("knowledge_chunks.id",ondelete="SET NULL"),nullable=True); relevance_score:Mapped[float]=mapped_column(Float); quoted_context:Mapped[str]=mapped_column(Text,default=""); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    report=relationship("Report",back_populates="evidence")


class ReportShare(Base):
    __tablename__="report_shares"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    report_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("reports.id",ondelete="CASCADE"),index=True)
    patient_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("patient_profiles.id",ondelete="CASCADE"))
    doctor_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("doctor_profiles.id",ondelete="CASCADE"),index=True)
    shared_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    revoked_at:Mapped[Optional[datetime]]=mapped_column(DateTime(timezone=True),nullable=True)
    report=relationship("Report",back_populates="shares")
    __table_args__=(
        Index("uq_active_report_doctor_share", "report_id", "doctor_id", unique=True, postgresql_where=(revoked_at.is_(None)), sqlite_where=(revoked_at.is_(None))),
    )

class DoctorReview(Base):
    __tablename__="doctor_reviews"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); report_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("reports.id",ondelete="CASCADE"),index=True); doctor_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("doctor_profiles.id",ondelete="CASCADE")); review_status:Mapped[str]=mapped_column(String(30),default="REVIEWED"); doctor_summary:Mapped[str]=mapped_column(Text); recommendation:Mapped[str]=mapped_column(Text,default=""); follow_up_required:Mapped[bool]=mapped_column(Boolean,default=False); follow_up_date:Mapped[Optional[date]]=mapped_column(Date,nullable=True); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)
    report=relationship("Report",back_populates="reviews")

class LoginEvent(Base):
    __tablename__="login_events"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid)
    user_id:Mapped[Optional[uuid.UUID]]=mapped_column(UUIDType,ForeignKey("users.id",ondelete="CASCADE"),nullable=True,index=True)
    email:Mapped[Optional[str]]=mapped_column(String(255),nullable=True)
    role:Mapped[Optional[str]]=mapped_column(String(20),nullable=True)
    auth_provider:Mapped[Optional[str]]=mapped_column(String(20),nullable=True)
    success:Mapped[bool]=mapped_column(Boolean,default=True,index=True)
    ip_address:Mapped[Optional[str]]=mapped_column(String(64),nullable=True)
    user_agent:Mapped[Optional[str]]=mapped_column(Text,nullable=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,index=True)

class Notification(Base):
    __tablename__="notifications"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); recipient_user_id:Mapped[uuid.UUID]=mapped_column(UUIDType,ForeignKey("users.id",ondelete="CASCADE"),index=True); type:Mapped[str]=mapped_column(String(50)); title:Mapped[str]=mapped_column(String(255)); message:Mapped[str]=mapped_column(Text); reference_id:Mapped[Optional[str]]=mapped_column(String(255),nullable=True); is_read:Mapped[bool]=mapped_column(Boolean,default=False,index=True); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class AuditLog(Base):
    __tablename__="audit_logs"
    id:Mapped[uuid.UUID]=mapped_column(UUIDType,primary_key=True,default=uid); user_id:Mapped[Optional[uuid.UUID]]=mapped_column(UUIDType,ForeignKey("users.id",ondelete="SET NULL"),nullable=True,index=True); action:Mapped[str]=mapped_column(String(120)); entity_type:Mapped[str]=mapped_column(String(80)); entity_id:Mapped[Optional[str]]=mapped_column(String(255),nullable=True); ip_address:Mapped[Optional[str]]=mapped_column(String(64),nullable=True); details_json:Mapped[dict]=mapped_column(JSON,default=dict); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)


class AssessmentEvent(Base):
    """Immutable, queryable interaction telemetry from an assessment.

    Raw section payloads are still retained on their assessment rows.  This
    table makes important events (for example every TARGET click) directly
    queryable without parsing JSON in PostgreSQL.
    """

    __tablename__ = "assessment_events"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uid)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True
    )
    assessment_type: Mapped[str] = mapped_column(String(40), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    event_sequence: Mapped[int] = mapped_column(Integer)
    occurred_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    elapsed_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        UniqueConstraint("session_id", "assessment_type", "event_type", "event_sequence", name="uq_assessment_event_sequence"),
    )


class CareMessage(Base):
    __tablename__ = "care_messages"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uid)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), index=True)
    sender_user_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class DoctorChangeRequest(Base):
    __tablename__ = "doctor_change_requests"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uid)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True)
    current_doctor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True)
    requested_doctor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", index=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class DoctorRating(Base):
    __tablename__ = "doctor_ratings"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uid)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("patient_profiles.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUIDType, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), index=True)
    report_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUIDType, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    __table_args__ = (
        UniqueConstraint("patient_id", "doctor_id", "report_id", name="uq_doctor_rating_report"),
    )

for m in [User,PatientProfile,DoctorProfile,Assignment,AssessmentSession,SpeechAssessment,SpeechFeature,SpeechTranscription,MemoryAssessment,AttentionAssessment,LifestyleAssessment,ModelArtifact,ModelRun,Prediction,Explanation,KnowledgeDocument,KnowledgeChunk,Report,ReportEvidence,ReportShare,DoctorReview,Notification,AuditLog,LoginEvent]:
    globals()[m.__name__]=m
