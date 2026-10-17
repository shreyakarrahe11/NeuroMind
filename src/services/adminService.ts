import { AppUser,DoctorUser,PatientUser,AssessmentRecord,AccountStatus } from '../types/assessment';
import { http } from '../api/http';
export interface SystemMetrics {totalUsers:number;totalPatients:number;totalDoctors:number;activeDoctors:number;pendingDoctors:number;totalAssessments:number;totalReports:number;pendingReviews:number;highRiskAssessments:number}
class AdminService {
 async getAllUsers():Promise<AppUser[]>{return await http<any[]>('/admin/users') as any}
 async getAllPatients():Promise<PatientUser[]>{return await http<any[]>('/admin/patients') as any}
 async getAllDoctors():Promise<DoctorUser[]>{return await http<any[]>('/admin/doctors') as any}
 async getAllReports():Promise<AssessmentRecord[]>{return await http<any[]>('/admin/reports') as any}
 async getAllAssessments():Promise<AssessmentRecord[]>{return await http<any[]>('/admin/assessments') as any}
 async getAssessmentClinicalData(assessmentId:string){return await http<any>(`/assessments/${assessmentId}/clinical-data`)}
 async updateUserStatus(userId:string,status:AccountStatus):Promise<AppUser>{return await http(`/admin/users/${userId}`,{method:'PUT',body:JSON.stringify({status})}) as any}
 async approveDoctor(doctorId:string,adminId?:string):Promise<DoctorUser>{return await http(`/admin/doctors/${doctorId}/approve`,{method:'PUT'}) as any}
 async rejectDoctor(doctorId:string):Promise<DoctorUser>{return await http(`/admin/doctors/${doctorId}/reject`,{method:'PUT'}) as any}
 async assignPatientToDoctor(patientId:string,doctorId:string):Promise<PatientUser>{return await http('/admin/assignments',{method:'POST',body:JSON.stringify({patient_id:patientId,doctor_id:doctorId})}) as any}
 async getDoctorAssistanceRequests():Promise<PatientUser[]>{return await http('/admin/doctor-assistance-requests') as PatientUser[]}
 async removeAssignment(patientId:string):Promise<PatientUser>{
   const as=await http<any[]>('/admin/assignments'); const a=as.find(x=>x.patientId===patientId&&x.status==='ACTIVE'); if(!a) throw new Error('Active assignment not found');
   await http(`/admin/assignments/${a.id}`,{method:'DELETE'}); const p=(await this.getAllPatients()).find(x=>x.id===patientId); return p as PatientUser;
 }
 async getSystemMetrics():Promise<SystemMetrics>{return await http('/admin/dashboard')}
 async getLoginActivity(limit=100){return await http<any[]>(`/admin/login-activity?limit=${limit}`)}
 async getAuditLogs(limit=100,offset=0){return await http<{items:any[];total:number;limit:number;offset:number}>(`/admin/audit-logs?limit=${limit}&offset=${offset}`)}
 async getAiReadiness(){return await http<any>('/admin/ai-readiness')}
 async indexKnowledgeBase(){return await http<any>('/rag/index',{method:'POST'})}
}
export const adminService=new AdminService();
