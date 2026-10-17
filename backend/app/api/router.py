
from fastapi import APIRouter
from .v1.auth import router as auth
from .v1.users import router as users
from .v1.patients import router as patients
from .v1.doctors import router as doctors
from .v1.admin import router as admin
from .v1.assessments import router as assessments
from .v1.ai import router as ai
from .v1.reports import router as reports
from .v1.notifications import router as notifications
from .v1.rag import router as rag
from .v1.care import router as care
api=APIRouter(prefix="/api/v1")
for r in [auth,users,patients,doctors,admin,assessments,ai,reports,notifications,rag,care]: api.include_router(r)
legacy=APIRouter(prefix="/api")
for r in [auth,users,patients,doctors,admin,assessments,ai,reports,notifications,rag,care]: legacy.include_router(r)
