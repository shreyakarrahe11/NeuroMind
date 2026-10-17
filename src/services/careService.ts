import { http } from '../api/http';

export interface CareContact {
  id: string;
  name: string;
  role: 'PATIENT' | 'DOCTOR';
  email: string;
}

export interface CareMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

export interface DoctorChangeRequest {
  id: string;
  patientId: string;
  patientName: string;
  requestedDoctorId?: string;
  requestedDoctorName?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

class CareService {
  getContacts() { return http<CareContact[]>('/care/contacts'); }
  getMessages(counterpartId: string) { return http<CareMessage[]>(`/care/messages/${counterpartId}`); }
  sendMessage(recipientId: string, body: string) {
    return http<CareMessage>('/care/messages', { method: 'POST', body: JSON.stringify({ recipient_id: recipientId, body }) });
  }
  getChangeRequests() { return http<DoctorChangeRequest[]>('/care/doctor-change-requests'); }
  requestDoctorChange(reason: string, requestedDoctorId?: string) {
    return http<DoctorChangeRequest>('/care/doctor-change-requests', {
      method: 'POST',
      body: JSON.stringify({ reason, requested_doctor_id: requestedDoctorId || null }),
    });
  }
  resolveDoctorChange(requestId: string, status: 'APPROVED' | 'REJECTED', doctorId?: string, resolutionNote = '') {
    return http<DoctorChangeRequest>(`/care/doctor-change-requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, doctor_id: doctorId || null, resolution_note: resolutionNote }),
    });
  }
  rateDoctor(doctorId: string, rating: number, comment: string) {
    return http('/care/ratings', {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, rating, comment }),
    });
  }
}

export const careService = new CareService();
