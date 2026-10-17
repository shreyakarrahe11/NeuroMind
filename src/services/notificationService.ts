import { AppNotification,UserRole } from '../types/assessment'; import { http } from '../api/http';
class NotificationService {
 async getNotificationsForUser(userId:string,userRole:UserRole):Promise<AppNotification[]>{return await http<any[]>('/notifications') as any}
 async getUnreadCount(userId:string,userRole:UserRole){return (await this.getNotificationsForUser(userId,userRole)).filter(n=>!n.read).length}
 async markAsRead(id:string){await http(`/notifications/${id}/read`,{method:'PUT'})}
 async markAllAsRead(userId:string){await http('/notifications/read-all',{method:'PUT'})}
}
export const notificationService=new NotificationService();
