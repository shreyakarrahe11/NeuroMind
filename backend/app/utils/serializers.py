from sqlalchemy import select

from ..models.entities import User, PatientProfile, DoctorProfile, Assignment, AssessmentSession, Report, Prediction, DoctorReview, Notification
def user_out(u:User):
    name=f"{u.first_name} {u.last_name}".strip()
    account_status=u.account_status.value if hasattr(u.account_status,"value") else str(u.account_status)
    doctor_pending=u.role=="DOCTOR" and u.doctor_profile and not u.doctor_profile.is_approved and account_status=="PENDING"
    display_status="PENDING" if doctor_pending else account_status if account_status in {"SUSPENDED","DEACTIVATED"} else ("ACTIVE" if u.is_active else "DEACTIVATED")
    data={"id":str(u.id),"name":name,"email":u.email,"role":u.role,"status":display_status,"accountStatus":account_status,"authProvider":u.auth_provider,"createdAt":u.created_at.isoformat(),"lastLogin":u.last_login_at.isoformat() if u.last_login_at else None}
    if u.patient_profile:
        p=u.patient_profile; data.update({"age":str((__import__("datetime").date.today()-p.date_of_birth).days//365) if p.date_of_birth else "","dateOfBirth":p.date_of_birth.isoformat() if p.date_of_birth else "","gender":p.gender or "Prefer not to say","education":p.education_level or "","occupation":p.occupation or "","phone":u.phone})
    if u.doctor_profile:
        d=u.doctor_profile; data.update({"department":d.hospital_clinic,"institution":d.hospital_clinic,"licenseNumber":d.license_number,"specialization":d.specialization,"qualification":d.qualification,"yearsOfExperience":d.years_of_experience,"bio":d.bio,"city":d.city,"area":d.area,"phone":u.phone,"isApproved":d.is_approved,"doctorProfileId":str(d.id),"approvedBy":None,"approvedAt":None})
    if u.role=="ADMIN": data.update({"accessLevel":"SUPER_ADMIN","department":"Clinical Operations & AI Governance"})
    return data
def patient_out(p:PatientProfile, db):
    u=db.get(User,p.user_id); d=next((a for a in db.query(Assignment).filter(Assignment.patient_id==p.id,Assignment.status=="ACTIVE").all()),None)
    data=user_out(u)
    data["doctorAssistanceRequestedAt"]=p.doctor_assignment_requested_at.isoformat() if p.doctor_assignment_requested_at else None
    if d:
        doc=db.get(DoctorProfile,d.doctor_id); du=db.get(User,doc.user_id) if doc else None
        data.update({"assignedDoctorId":str(doc.user_id) if doc else None,"assignedDoctorName":f"{du.first_name} {du.last_name}".strip() if du else None,"assignedAt":d.assigned_at.isoformat()})
    return data
def prediction_out(pred):
    payload=pred.prediction_json or {}; probabilities=payload.get("classProbabilities",{})
    dementia=float(probabilities.get("Dementia",pred.probability or 0))
    non_dementia=float(probabilities.get("Non-Dementia",max(0,1-dementia)))
    return {"id":str(pred.id),"prediction":pred.prediction_label,"predictionThreshold":None,"dementiaProbability":dementia,"nonDementiaProbability":non_dementia,"classProbabilities":probabilities,"confidenceScore":pred.confidence_score or 0,"modalityScores":payload.get("modalityScores",{}),"shapExplanation":payload.get("shapExplanation",[]),"ragKnowledge":payload.get("ragKnowledge",[]),"reportSummary":payload.get("reportSummary"),"analyzedAt":pred.created_at.isoformat()}
def assessment_out(a,db):
    p=db.get(PatientProfile,a.patient_id); u=db.get(User,p.user_id) if p else None
    pred=a.predictions[-1] if a.predictions else None
    assignment=db.scalar(select(Assignment).where(Assignment.patient_id==a.patient_id,Assignment.status=="ACTIVE"))
    doctor=db.get(DoctorProfile,assignment.doctor_id) if assignment else None
    doctor_user=db.get(User,doctor.user_id) if doctor else None
    patient_age=str((__import__("datetime").date.today()-p.date_of_birth).days//365) if p and p.date_of_birth else ""
    return {
        "assessmentId":str(a.id),
        "patientId":str(p.user_id) if p else None,
        "patientName":f"{u.first_name} {u.last_name}".strip() if u else "",
        "patientAge":patient_age,
        "patientGender":p.gender if p else "",
        "patientEducation":p.education_level if p else "",
        "createdAt":a.created_at.isoformat(),
        "updatedAt":a.updated_at.isoformat(),
        "status":{
            "speech":a.speech is not None,
            "memory":a.memory is not None,
            "attention":a.attention is not None,
            "lifestyle":a.lifestyle is not None,
        },
        "predictionResult":prediction_out(pred) if pred else None,
        "speechProcessing":({"preprocessing":a.speech.preprocessing_status,"features":a.speech.feature_extraction_status,"transcription":a.speech.transcription_status,"errorCode":a.speech.processing_error_code} if a.speech else None),
        "reportText":a.report.ai_report if a.report else None,
        "reportStatus":a.report.report_status if a.report else "PENDING",
        "assignedDoctorId":str(doctor.user_id) if doctor else None,
        "assignedDoctorName":f"{doctor_user.first_name} {doctor_user.last_name}".strip() if doctor_user else None,
        "doctorNotes":a.report.reviews[-1].doctor_summary if a.report and a.report.reviews else None,
        "doctorRecommendations":a.report.reviews[-1].recommendation if a.report and a.report.reviews else None,
    }
def report_out(r,db):
    pred=db.get(Prediction,r.prediction_id) if r.prediction_id else None
    p=db.get(PatientProfile,r.patient_id); u=db.get(User,p.user_id) if p else None
    review=r.reviews[-1] if r.reviews else None
    shares=[]
    for sh in r.shares:
        doctor=db.get(DoctorProfile,sh.doctor_id)
        du=db.get(User,doctor.user_id) if doctor else None
        shares.append({"doctorId":str(doctor.user_id) if doctor else None,"doctorName":f"{du.first_name} {du.last_name}".strip() if du else None,"sharedAt":sh.shared_at.isoformat(),"revokedAt":sh.revoked_at.isoformat() if sh.revoked_at else None})
    patient_age=str((__import__("datetime").date.today()-p.date_of_birth).days//365) if p and p.date_of_birth else ""
    return {"id":str(r.id),"reportId":str(r.id),"assessmentId":str(r.session_id),"patientId":str(p.user_id) if p else None,"patientName":f"{u.first_name} {u.last_name}".strip() if u else "","patientAge":patient_age,"patientGender":p.gender if p else "","patientEducation":p.education_level if p else "","createdAt":r.created_at.isoformat(),"updatedAt":r.updated_at.isoformat(),"reportTitle":r.report_title,"summary":r.summary,"riskLevel":r.risk_level,"aiReport":r.ai_report,"reportText":r.ai_report,"evidenceSummary":r.evidence_summary,"limitations":r.limitations,"reportStatus":r.report_status,"predictionResult":prediction_out(pred) if pred else None,"doctorNotes":review.doctor_summary if review else None,"doctorRecommendations":review.recommendation if review else None,"reviewedBy":str(review.doctor_id) if review else None,"reviewedAt":review.updated_at.isoformat() if review else None,"shares":shares}
def notification_out(n):
    return {"id":str(n.id),"recipientId":str(n.recipient_user_id),"title":n.title,"message":n.message,"referenceId":n.reference_id,"read":n.is_read,"createdAt":n.created_at.isoformat(),"type":n.type,"link":"/patient/reports" if n.type=="REPORT_REVIEWED" else "/doctor/reports"}
