import { AssessmentRecord, FullSessionState, MultimodalPredictionResult } from '../types/assessment';
import { http } from '../api/http';
class AssessmentService {
 async saveCompletedAssessment(session:FullSessionState,predictionResult:MultimodalPredictionResult,reportText?:string):Promise<AssessmentRecord>{
   const reports=await http<any[]>('/patients/me/reports');
   const r=reports.find(x=>x.assessmentId===session.sessionId);
   if(!r) throw new Error('Server report was not created.');
   return r as AssessmentRecord;
 }
 async getAssessmentById(id:string){ return await http(`/assessments/${id}`) as AssessmentRecord; }
 async getAllAssessments(){ return [] as AssessmentRecord[]; }
}
export const assessmentService=new AssessmentService();
