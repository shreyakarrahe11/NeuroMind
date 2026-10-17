import { DoctorUser, PatientUser, AssessmentRecord, ReportStatus } from '../types/assessment';
import { http } from '../api/http';
class DoctorService {
 async getDoctorById(id:string):Promise<DoctorUser|undefined>{ const d=await http<any[]>('/doctors'); return d.find(x=>x.id===id) as DoctorUser; }
 async getAssignedPatients(doctorId:string):Promise<PatientUser[]>{ return await http<any[]>('/doctors/me/patients') as any; }
 async getPatientAssessments(patientId:string):Promise<AssessmentRecord[]>{ return await http<any[]>(`/doctors/me/patients/${patientId}/assessments`) as any; }
 async getDoctorReports(doctorId:string):Promise<AssessmentRecord[]>{ return await http<any[]>('/doctors/me/reports') as any; }
 async reviewReport(assessmentId:string,doctorId:string,doctorNotes:string,doctorRecommendations:string,status:ReportStatus='REVIEWED'):Promise<AssessmentRecord>{
   const reports=await this.getDoctorReports(doctorId); const r:any=(reports as any[]).find((x:any)=>x.assessmentId===assessmentId || x.id===assessmentId);
   if(!r) throw new Error('Report not found or patient is not assigned to this doctor');
   return await http(`/reports/${r.reportId||r.id}/review`,{method:'POST',body:JSON.stringify({doctor_summary:doctorNotes,recommendation:doctorRecommendations,follow_up_required:false})}) as any;
 }
 async updateReportStatus(assessmentId:string,status:ReportStatus,doctorId?:string){ const rows=await this.getDoctorReports(doctorId||''); return rows.find((x:any)=>x.assessmentId===assessmentId) || rows[0]; }
}
export const doctorService=new DoctorService();
