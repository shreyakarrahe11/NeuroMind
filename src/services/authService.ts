import { AppUser, PatientUser, DoctorUser, UserRole } from '../types/assessment';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const USER_KEY='neuromind_api_user';

// Remove tokens written by older builds. Authentication now uses HttpOnly,
// SameSite cookies that JavaScript cannot read.
localStorage.removeItem('neuromind_access_token');
localStorage.removeItem('neuromind_refresh_token');
localStorage.removeItem(USER_KEY);

function throwBackendUnavailableError(): never {
  throw new Error('NeuroMind backend is unavailable. Please start the API server and confirm VITE_API_BASE_URL is correct.');
}

async function request(path:string, init:RequestInit={}) {
  try {
    const run=()=>{
      const headers=new Headers(init.headers);
      if (!(init.body instanceof FormData)) headers.set('Content-Type','application/json');
      return fetch(`${API_BASE_URL}${path}`,{...init,headers,credentials:'include'});
    };
    let res=await run();
    if(res.status===401 && !path.startsWith('/auth/')){
      const renewed=await fetch(`${API_BASE_URL}/auth/refresh`,{method:'POST',credentials:'include'});
      if(renewed.ok) res=await run();
    }
    let data:any={}; try{data=await res.json()}catch{}
    if(!res.ok) throw new Error(data.detail || data.message || `Request failed (${res.status})`);
    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throwBackendUnavailableError();
    }
    throw error;
  }
}
function cacheUser(u:any):AppUser { sessionStorage.setItem(USER_KEY,JSON.stringify(u)); return u as AppUser; }

export interface RegisterPatientDTO {name:string;email:string;password?:string;age:string;gender:any;education:string;occupation:string;phone?:string}
export interface RegisterDoctorDTO {name:string;email:string;password?:string;department:string;institution:string;licenseNumber:string;specialization:string;phone?:string;city?:string;area?:string;yearsOfExperience?:number;bio?:string;qualification?:string}

class AuthService {
  private clerkExchangeInFlight: Promise<PatientUser> | null = null;

  getCurrentUser():AppUser|null { try{return JSON.parse(sessionStorage.getItem(USER_KEY)||'null')}catch{return null} }
  getToken(){return null}
  async login(email:string,password?:string,expectedRole?:UserRole):Promise<AppUser>{
    const data=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password:password||''})});
    if(expectedRole && data.user?.role!==expectedRole){
      await fetch(`${API_BASE_URL}/auth/logout`,{method:'POST',credentials:'include'}).catch(()=>undefined);
      throw new Error(`This account belongs to the ${String(data.user?.role||'other').toLowerCase()} portal. Select the correct login tab.`);
    }
    return cacheUser(data.user);
  }
  async registerPatient(data:RegisterPatientDTO):Promise<PatientUser>{
    const res=await request('/auth/register',{method:'POST',body:JSON.stringify({...data,password:data.password||''})});
    return cacheUser(res.user) as PatientUser;
  }

  async exchangeClerkSession(token:string, fallback?:{first_name?:string;last_name?:string}):Promise<PatientUser>{
    if (this.clerkExchangeInFlight) return this.clerkExchangeInFlight;

    this.clerkExchangeInFlight = (async () => {
      try {
        const res=await fetch(`${API_BASE_URL}/auth/clerk/exchange`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body:JSON.stringify({token,...fallback}),
        });
        let data:any={}; try{data=await res.json()}catch{}
        if(!res.ok) throw new Error(data.detail || data.message || `Clerk session exchange failed (${res.status})`);
        return cacheUser(data.user) as PatientUser;
      } catch (error) {
        if (error instanceof TypeError) {
          throwBackendUnavailableError();
        }
        throw error;
      } finally {
        this.clerkExchangeInFlight = null;
      }
    })();

    return this.clerkExchangeInFlight;
  }
  async registerDoctor(data:RegisterDoctorDTO):Promise<DoctorUser>{
    const res=await request('/auth/register-doctor',{method:'POST',body:JSON.stringify({...data,password:data.password||''})});
    return res.user as DoctorUser;
  }
  async loginAsDemoRole(role:UserRole):Promise<AppUser>{
    throw new Error(`Demo role switching is disabled. Sign in to the actual ${role.toLowerCase()} account.`);
  }
  async refresh(){
    await request('/auth/refresh',{method:'POST'});
  }
  logout(){
    void fetch(`${API_BASE_URL}/auth/logout`,{method:'POST',credentials:'include',keepalive:true}).catch(()=>undefined);
    sessionStorage.removeItem(USER_KEY);
  }
  async updateProfile(updated:Partial<AppUser>):Promise<AppUser>{
    const res=await request('/users/me',{method:'PUT',body:JSON.stringify(updated)}); return cacheUser(res);
  }
}
export const authService=new AuthService();
