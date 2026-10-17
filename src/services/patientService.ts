import { PatientUser, DoctorUser, AssessmentRecord } from '../types/assessment';
import { http } from '../api/http';
class PatientService {
 async getPatientById(id:string):Promise<PatientUser|undefined>{ const me:any=await http('/patients/me'); return me.id===id?me:undefined; }
 async getPatientAssessments(patientId:string):Promise<AssessmentRecord[]>{ const a=await http<any[]>('/patients/me/assessments'); return a as any; }
 async getPatientReports(patientId:string):Promise<AssessmentRecord[]>{ return await http<any[]>('/patients/me/reports') as any; }
 async getLatestAssessment(patientId:string){ const a=await this.getPatientAssessments(patientId); return a[0]; }
 async updatePatientDemographics(patientId:string,data:Partial<PatientUser>):Promise<PatientUser>{
   const u=await http('/patients/me',{method:'PUT',body:JSON.stringify(data)}) as PatientUser;
   sessionStorage.setItem('neuromind_api_user',JSON.stringify(u));
   return u;
 }
 async getAvailableDoctors(search=''):Promise<DoctorUser[]>{ return await http<any[]>(`/doctors?limit=100&search=${encodeURIComponent(search)}`) as any; }
 async chooseDoctor(doctorId:string):Promise<PatientUser>{ return await http('/patients/me/doctor-choice',{method:'POST',body:JSON.stringify({doctor_id:doctorId})}) as PatientUser; }
 async requestDoctorHelp():Promise<PatientUser>{ return await http('/patients/me/doctor-assistance',{method:'POST'}) as PatientUser; }
 async cancelDoctorHelp():Promise<PatientUser>{ return await http('/patients/me/doctor-assistance',{method:'DELETE'}) as PatientUser; }
 async shareReportWithDoctor(assessmentId:string,patientId:string,doctorId:string):Promise<AssessmentRecord>{
   const reports=await http<any[]>('/patients/me/reports'); const r=reports.find(x=>x.assessmentId===assessmentId||x.id===assessmentId);
   if(!r) throw new Error('Report not found');
   return await http(`/patients/me/reports/${r.reportId||r.id}/share`,{method:'POST',body:JSON.stringify({doctor_id:doctorId})}) as any;
 }
 async revokeReportShare(reportId:string,doctorId:string):Promise<void>{
   await http(`/patients/me/reports/${reportId}/share/${doctorId}`,{method:'DELETE'});
 }
}
export const patientService=new PatientService();
