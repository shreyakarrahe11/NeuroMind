import { FullSessionState, MultimodalPredictionResult, PatientInfo, SpeechAssessmentData, MemoryAssessmentData, AttentionAssessmentData, LifestyleAssessmentData, SHAPFeatureContribution, RAGKnowledgeItem } from '../types/assessment';

const API_BASE_URL=(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function refreshSession():Promise<boolean>{
  try{
    const res=await fetch(`${API_BASE_URL}/auth/refresh`,{method:'POST',credentials:'include'});
    return res.ok;
  }catch{return false;}
}

async function request(path:string,init:RequestInit={}) {
  const doRequest=async()=>{
    const headers=new Headers(init.headers);
    if(!(init.body instanceof FormData)) headers.set('Content-Type','application/json');
    return fetch(`${API_BASE_URL}${path}`,{...init,headers,credentials:'include'});
  };
  let res=await doRequest();
  if(res.status===401 && !path.startsWith('/auth/')){
    if(await refreshSession()) res=await doRequest();
  }
  let data:any={}; try{data=await res.json()}catch{}
  if(!res.ok) throw new Error(data.detail || data.message || `API request failed (${res.status})`);
  return data;
}
export const isLiveBackendAvailable=()=>true;
export const getApiEndpoint=()=>API_BASE_URL;

export async function createAssessmentSession(patientInfo:PatientInfo):Promise<FullSessionState>{
  const data=await request('/assessments',{method:'POST',body:JSON.stringify({patientInfo})});
  return {...data,sessionId:data.sessionId,status:data.status,speech:{durationSeconds:0,promptType:'reading',promptId:'reading-passage-1'},memory:{encodingImagesSeen:[],exposureDurationMs:3000,immediateRecallText:'',immediateRecallItems:[],delayedRecallText:'',delayedRecallItems:[],recognitionSelectedIds:[],recognitionCorrectIds:[],rawMetrics:{immediateRecallCount:0,delayedRecallCount:0,recognitionTruePositives:0,recognitionFalsePositives:0,recognitionTotalCorrect:0}},attention:{digitSpanMaxScore:0,digitSpanTrials:[],reactionTimeTrials:[],reactionTimeMedianMs:0,reactionTimeMeanMs:0,sustainedAttention:{totalStimuliCount:0,targetCount:0,hits:0,misses:0,falseAlarms:0,correctRejections:0,meanResponseTimeMs:0,reactionTimes:[]},stimulusTypeUsed:'standard'},lifestyle:{sleepHours:7,sleepQuality:'Moderate',exerciseHoursWeek:2,smoking:false,alcoholUse:'None',medicalHistory:['None']},...data} as FullSessionState;
}
export async function uploadSpeech(sessionId:string,speechData:SpeechAssessmentData){
  if(!speechData.audioBlob) throw new Error('Select or record an audio file before uploading.');
  const mime=speechData.audioBlob.type.toLowerCase();
  const fallbackExtension=mime.includes('webm')?'webm':mime.includes('ogg')?'ogg':mime.includes('mpeg')?'mp3':mime.includes('flac')?'flac':mime.includes('m4a')?'m4a':'wav';
  const form=new FormData(); form.append('audioFile',speechData.audioBlob,speechData.fileName||`speech.${fallbackExtension}`);
  form.append('promptId',speechData.promptId); form.append('promptType',speechData.promptType);
  const d=await request(`/assessments/${sessionId}/speech`,{method:'POST',body:form});
  for(let attempt=0;attempt<600;attempt++){
    const assessment=await request(`/assessments/${sessionId}`);
    const featureStatus=assessment.speechProcessing?.features;
    if(featureStatus==='COMPLETED') return {success:true,duration:assessment.speech?.durationSeconds||d.duration||speechData.durationSeconds||0,embeddingExtracted:true};
    if(featureStatus==='ACOUSTIC_ONLY') throw new Error('Speech audio was decoded, but the trained speech model is not configured. Install the speech model artifact before continuing.');
    if(featureStatus==='FAILED') throw new Error(`Speech processing failed (${assessment.speechProcessing?.errorCode || 'UNKNOWN'}). Confirm the audio is valid and the AI worker/model dependencies are installed.`);
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw new Error('Speech processing timed out. Please retry with a shorter audio file or check the backend worker.');
}
export async function submitMemoryAssessment(sessionId:string,memoryData:MemoryAssessmentData){
  return request(`/assessments/${sessionId}/memory`,{method:'POST',body:JSON.stringify({memoryData})});
}
export async function submitAttentionAssessment(sessionId:string,attentionData:AttentionAssessmentData){
  return request(`/assessments/${sessionId}/attention`,{method:'POST',body:JSON.stringify({attentionData})});
}
export async function submitLifestyleAssessment(sessionId:string,lifestyleData:LifestyleAssessmentData){
  return request(`/assessments/${sessionId}/lifestyle`,{method:'POST',body:JSON.stringify({lifestyleData})});
}
export async function completeAssessment(sessionId:string){ return request(`/assessments/${sessionId}/complete`,{method:'POST'}); }

export async function runPrediction(session:FullSessionState):Promise<MultimodalPredictionResult>{
  const started=await request(`/ai/assessments/${session.sessionId}/run`,{method:'POST'});
  if(!started.runId) throw new Error('The backend did not return an analysis run ID.');
  const deadline=Date.now()+20*60*1000;
  while(Date.now()<deadline){
    const s=await request(`/ai/assessments/${session.sessionId}/status?runId=${encodeURIComponent(started.runId)}`);
    const status=String(s.status).toLowerCase();
    if(status==='completed'){
      if(!s.prediction) throw new Error('Analysis completed without a saved prediction. Contact support.');
      return s.prediction;
    }
    if(status==='pending_model') throw new Error('The trained AI model is not configured. Ask the administrator to check model readiness.');
    if(status==='failed') throw new Error(s.message || 'AI processing failed. Please try again or contact support.');
    await new Promise(r=>setTimeout(r,2000));
  }
  throw new Error('Analysis is taking longer than expected. Retry to check the same server run, or contact support.');
}
export async function getSHAPExplanation(sessionId:string):Promise<SHAPFeatureContribution[]>{
  return request(`/ai/assessments/${sessionId}/explanations`);
}
export async function getRAGKnowledge(query?:string):Promise<RAGKnowledgeItem[]>{
  return request('/rag/search',{method:'POST',body:JSON.stringify({query:query||'dementia cognitive assessment'})});
}
export async function generateReportRecord(session:FullSessionState):Promise<{reportText:string;report:any}>{
  return request(`/reports/generate/${session.sessionId}`,{method:'POST'});
}
export async function generateReport(session:FullSessionState):Promise<string>{
  for(let attempt=0;attempt<90;attempt++){
    try{
      const d=await generateReportRecord(session);
      if(!d.reportText) throw new Error('The report is empty.');
      return d.reportText;
    }catch(error){
      if(!(error instanceof Error) || !error.message.includes('Report generation is already in progress') || attempt===89) throw error;
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
  }
  throw new Error('The report is taking longer than expected.');
}
