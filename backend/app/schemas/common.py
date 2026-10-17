
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from datetime import date
import re
from typing import Any, Literal, Optional
from uuid import UUID
class RegisterPatient(BaseModel):
    name:str; email:str; password:str=Field(min_length=8); age:str=""; gender:str="Prefer not to say"; education:str=""; occupation:str=""; phone:Optional[str]=None
class RegisterDoctor(BaseModel):
    name:str; email:str; password:str=Field(min_length=8); department:str=""; institution:str=""; licenseNumber:str; specialization:str; qualification:str=""; phone:Optional[str]=None
    city: str = Field(default="", max_length=120)
    area: str = Field(default="", max_length=120)
    yearsOfExperience: Optional[int] = Field(default=None, ge=0, le=75)
    bio: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("password")
    @classmethod
    def strong_doctor_password(cls, value: str):
        if len(value) < 12 or not all(re.search(pattern, value) for pattern in (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]")):
            raise ValueError("Password must be 12+ characters with upper, lower, number, and symbol")
        return value
class Login(BaseModel): email:str; password:str
class Refresh(BaseModel):
    refresh_token:Optional[str]=None
class AssessmentCreate(BaseModel): patientInfo:Optional[dict[str,Any]]=None
class GenericData(BaseModel): data:dict[str,Any]


class AssessmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    currentStep: Optional[Literal["overview", "speech", "memory", "attention", "lifestyle", "review", "analyzing", "results", "report"]] = None
    status: Optional[Literal["IN_PROGRESS", "COMPLETED", "PROCESSING", "ANALYZED", "FAILED"]] = None


class ClerkExchange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=20, max_length=20_000)
    first_name: Optional[str] = Field(default=None, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)


class MemoryRawMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    immediateRecallCount: int = Field(ge=0, le=10)
    delayedRecallCount: int = Field(ge=0, le=10)
    recognitionTruePositives: int = Field(ge=0, le=10)
    recognitionFalsePositives: int = Field(ge=0, le=10)
    recognitionTotalCorrect: int = Field(ge=0, le=20)

    @model_validator(mode="after")
    def validate_recognition_counts(self):
        expected_total = self.recognitionTruePositives + (10 - self.recognitionFalsePositives)
        if self.recognitionTotalCorrect != expected_total:
            raise ValueError("recognitionTotalCorrect must equal hits plus correct rejections")
        return self


class MemoryAssessmentData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    encodingImagesSeen: list[str] = Field(min_length=10, max_length=10)
    exposureDurationMs: int = Field(ge=500, le=30_000)
    immediateRecallText: str = Field(min_length=1, max_length=2_000)
    immediateRecallItems: list[str] = Field(max_length=20)
    delayedRecallText: str = Field(min_length=1, max_length=2_000)
    delayedRecallItems: list[str] = Field(max_length=20)
    recognitionSelectedIds: list[str] = Field(max_length=20)
    recognitionCorrectIds: list[str] = Field(max_length=10)
    rawMetrics: MemoryRawMetrics
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    stepDurationsMs: dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_unique_stimuli(self):
        if len(set(self.encodingImagesSeen)) != 10:
            raise ValueError("encodingImagesSeen must contain ten unique target identifiers")
        if not set(self.recognitionCorrectIds).issubset(set(self.encodingImagesSeen)):
            raise ValueError("recognitionCorrectIds must refer to encoded target identifiers")
        if not set(self.recognitionCorrectIds).issubset(set(self.recognitionSelectedIds)):
            raise ValueError("recognitionCorrectIds must also be selected identifiers")
        return self


class MemorySubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    memoryData: MemoryAssessmentData


class ReviewIn(BaseModel):
    doctor_summary:str=Field(min_length=1,max_length=10000)
    recommendation:str=Field(default="",max_length=10000)
    follow_up_required:bool=False
    follow_up_date:Optional[date]=None


class PatientProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=240)
    dateOfBirth: Optional[date] = None
    gender: Optional[Literal["Male", "Female", "Other", "Prefer not to say"]] = None
    education: Optional[str] = Field(default=None, max_length=255)
    occupation: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)

    @field_validator("dateOfBirth")
    @classmethod
    def valid_adult_birth_date(cls, value: Optional[date]):
        if value is None:
            return value
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 18 or age > 120:
            raise ValueError("Patient age must be between 18 and 120 years")
        return value


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=240)
    first_name: Optional[str] = Field(default=None, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=50)


class DoctorProfileUpdate(UserProfileUpdate):
    department: Optional[str] = Field(default=None, max_length=255)
    institution: Optional[str] = Field(default=None, max_length=255)
    specialization: Optional[str] = Field(default=None, max_length=255)
    qualification: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=120)
    area: Optional[str] = Field(default=None, max_length=120)
    yearsOfExperience: Optional[int] = Field(default=None, ge=0, le=75)
    bio: Optional[str] = Field(default=None, max_length=2000)


class PatientDoctorChoice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    doctor_id: UUID


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[Literal["PENDING", "ACTIVE", "SUSPENDED", "DEACTIVATED"]] = None
    first_name: Optional[str] = Field(default=None, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=50)


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    patient_id: UUID
    doctor_id: UUID


class AssignmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ACTIVE", "INACTIVE"]


class ReportShareIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doctor_id: UUID


class RagSearchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=2, max_length=2_000)
    top_k: int = Field(default=5, ge=1, le=20)


class AttentionRawResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    occurredAt: str = Field(max_length=50)
    elapsedMs: float = Field(ge=0, le=7_200_000)
    mediaTimeMs: float = Field(ge=0, le=7_200_000)
    outcome: Literal["hit", "false_alarm"]
    targetWindowIndex: Optional[int] = Field(default=None, ge=0, le=100_000)
    reactionTimeMs: Optional[float] = Field(default=None, ge=0, le=60_000)


class SustainedAttentionData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    totalStimuliCount: int = Field(default=0, ge=0, le=100_000)
    targetCount: int = Field(default=0, ge=0, le=100_000)
    hits: int = Field(default=0, ge=0, le=100_000)
    misses: int = Field(default=0, ge=0, le=100_000)
    falseAlarms: int = Field(default=0, ge=0, le=100_000)
    correctRejections: int = Field(default=0, ge=0, le=100_000)
    meanResponseTimeMs: float = Field(default=0, ge=0, le=60_000)
    reactionTimes: list[float] = Field(default_factory=list, max_length=100_000)
    rawResponses: list[AttentionRawResponse] = Field(default_factory=list, max_length=100_000)


class DigitSpanTrialIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    digitCount: int = Field(ge=1, le=20)
    sequence: list[int] = Field(min_length=1, max_length=20)
    userResponse: list[int] = Field(max_length=20)
    isCorrect: bool
    timeTakenMs: float = Field(ge=0, le=600_000)
    occurredAt: Optional[str] = Field(default=None, max_length=50)


class ReactionTimeTrialIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trialNumber: int = Field(ge=1, le=10_000)
    delayMs: float = Field(ge=0, le=600_000)
    reactionTimeMs: float = Field(ge=0, le=60_000)
    isValid: bool
    occurredAt: Optional[str] = Field(default=None, max_length=50)


class AttentionAssessmentDataIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    digitSpanMaxScore: Optional[int] = Field(default=None, ge=0, le=20)
    digitSpanTrials: list[DigitSpanTrialIn] = Field(default_factory=list, max_length=100)
    reactionTimeTrials: list[ReactionTimeTrialIn] = Field(default_factory=list, max_length=10_000)
    reactionTimeMedianMs: Optional[float] = Field(default=None, ge=0, le=60_000)
    reactionTimeMeanMs: Optional[float] = Field(default=None, ge=0, le=60_000)
    sustainedAttention: Optional[SustainedAttentionData] = None
    stimulusTypeUsed: Optional[Literal["standard", "audio", "video", "music"]] = None
    digitSpan: Optional[int] = Field(default=None, ge=0, le=20)
    reactionTimeMs: Optional[float] = Field(default=None, ge=0, le=60_000)
    visualAttention: Optional[SustainedAttentionData] = None
    audioAttention: Optional[SustainedAttentionData] = None
    musicAttention: Optional[SustainedAttentionData] = None
    videoAttention: Optional[SustainedAttentionData] = None
    attentionScore: Optional[float] = Field(default=None, ge=0, le=100)
    startedAt: Optional[str] = Field(default=None, max_length=50)
    completedAt: Optional[str] = Field(default=None, max_length=50)
    totalDurationMs: Optional[float] = Field(default=None, ge=0, le=7_200_000)


class AttentionSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attentionData: AttentionAssessmentDataIn


class LifestyleAssessmentDataIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sleepHours: Literal["<4", "5-6", "7-8", "9-10", ">10"] | float
    sleepQuality: Literal["Bad", "Moderate", "Good"]
    exerciseHoursWeek: Literal["<1", "1-2", "3-5", "6-10", ">10"] | float
    smoking: bool
    alcoholUse: Literal["None", "Occasional", "Frequent"]
    hypertension: Optional[bool] = None
    diabetes: Optional[bool] = None
    cardiovascular: Optional[bool] = None
    medicalHistory: list[Literal["Hypertension", "Diabetes", "Cardiovascular", "Depression", "Head Injury", "None"]] = Field(min_length=1, max_length=6)
    dailyLifestyle: Optional[Literal["Very healthy", "Generally healthy", "Moderate", "Unhealthy"]] = None
    socialActivity: Optional[Literal["Rarely", "Occasionally", "Several times a week", "Daily"]] = None

    @model_validator(mode="after")
    def history_matches_answers(self):
        expected = []
        if self.hypertension:
            expected.append("Hypertension")
        if self.diabetes:
            expected.append("Diabetes")
        if self.cardiovascular:
            expected.append("Cardiovascular")
        if expected and "None" in self.medicalHistory:
            raise ValueError("medicalHistory cannot include None with a reported condition")
        return self


class LifestyleSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lifestyleData: LifestyleAssessmentDataIn
