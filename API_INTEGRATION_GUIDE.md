# NeuroMind API integration guide

Base URL:

```text
http://localhost:8000/api/v1
```

## Existing UI -> backend mapping

### Patient

```text
Patient sign-in/sign-up
 -> Clerk
 -> POST /auth/clerk/exchange

Patient profile
 -> GET/PUT /patients/me

Start assessment
 -> POST /assessments

Memory
 -> POST /assessments/{assessment_id}/memory

Attention
 -> POST /assessments/{assessment_id}/attention

Lifestyle
 -> POST /assessments/{assessment_id}/lifestyle

Speech upload
 -> POST /assessments/{assessment_id}/speech

Complete assessment
 -> POST /assessments/{assessment_id}/complete

Run AI
 -> POST /ai/assessments/{assessment_id}/run

AI status
 -> GET /ai/assessments/{assessment_id}/status

Patient reports
 -> GET /patients/me/reports

Notifications
 -> GET /patients/me/notifications
```

### Doctor

```text
Doctor sign-in
 -> POST /auth/login

Doctor profile
 -> GET/PUT /doctors/me

Patients
 -> GET /doctors/me/patients

Patient details
 -> GET /doctors/me/patients/{patient_id}

Assessments
 -> GET /doctors/me/patients/{patient_id}/assessments

Reports
 -> GET /doctors/me/reports

Review
 -> POST/PUT /reports/{report_id}/review
```

### Admin

```text
Admin sign-in
 -> POST /auth/login

Dashboard
 -> GET /admin/dashboard

Users
 -> GET /admin/users

Doctors
 -> GET /admin/doctors

Approve doctor
 -> PUT /admin/doctors/{doctor_id}/approve

Reject doctor
 -> PUT /admin/doctors/{doctor_id}/reject

Assignments
 -> POST /admin/assignments
 -> GET /admin/assignments
 -> PUT /admin/assignments/{assignment_id}
 -> DELETE /admin/assignments/{assignment_id}
```

## Security rule

The backend decides whether a user is allowed to read a record. Frontend route hiding is not a security mechanism.
