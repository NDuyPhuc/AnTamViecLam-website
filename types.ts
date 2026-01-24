
export enum View {
  Jobs = 'JOBS',
  Insurance = 'INSURANCE',
  Messaging = 'MESSAGING',
  Chatbot = 'CHATBOT',
  Profile = 'PROFILE',
  Recommendations = 'RECOMMENDATIONS',
}

export interface Job {
  id: string;
  title: string;
  description: string;
  
  employerId: string;
  employerName: string;
  employerProfileUrl: string | null;

  addressString: string;
  location: string; // Chuỗi gốc từ DB
  coordinates?: { lat: number; lng: number }; // Tối ưu: Parsed coordinates cho tính toán nhanh

  payRate: number | "Thỏa thuận";
  payType: 'THEO GIỜ' | 'THEO NGÀY' | 'THEO THÁNG';
  jobType?: 'Thời vụ' | 'Bán thời gian' | 'Linh hoạt' | 'Toàn thời gian';
  
  status: 'OPEN' | 'CLOSED'; // OPEN maps to 'active' logic in Admin
  createdAt: string; // Firestore Timestamp converted to ISO string
  hiredWorkerId: string | null;

  distance?: number; // Distance in km from the user
  applicantCount?: number;

  // New fields
  deadline?: string; // ISO Date string for expiration
  isUrgent?: boolean; // Flag for urgent hiring
}


export enum MessageAuthor {
  User = 'USER',
  Bot = 'BOT',
}

export interface ChatMessage {
  author: MessageAuthor;
  text: string;
}

export enum UserRole {
  Worker = 'WORKER',
  Employer = 'EMPLOYER',
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  duration: string;
}

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface UserData {
  uid: string;
  email: string | null;
  userType: UserRole;
  createdAt: string; // Firestore Timestamp converted to ISO string
  fullName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  profileImageUrl?: string | null;
  fcmTokens?: string[]; // For push notifications
  // Worker-specific profile fields
  bio?: string;
  skills?: string[];
  workHistory?: WorkExperience[];
  cvUrl?: string | null; // URL to the uploaded CV (PDF/Doc)
  cvName?: string | null; // Original file name of the CV
  
  // Blockchain & CSR fields (New)
  walletAddress?: string; // Địa chỉ ví Blockchain (giả lập)
  csrScore?: number; // Điểm trách nhiệm xã hội cho NTD
  welfareFundBalance?: number; // Số dư quỹ thưởng an sinh của NTD
  pensionBookBalance?: number; // Số dư sổ hưu trí của NLĐ

  // KYC Fields - Admin Sync
  kycStatus?: KycStatus;
  kycImages?: string[]; // Array of image URLs [front, back, portrait] OR [license, id_front, portrait] for employer
  kycRejectReason?: string;
  kycSubmittedAt?: string;
  taxCode?: string; // Mã số thuế (Cho nhà tuyển dụng)
  
  // Security Fields - Admin Sync
  isDisabled?: boolean; // Nếu true => Ban user
}

export type LogType = 'PAYMENT' | 'BONUS' | 'PENALTY' | 'LEAVE' | 'TERMINATION' | 'HIRED';

export interface EmploymentLog {
  id: string;
  type: LogType;
  title: string;
  description?: string;
  amount?: number; // Số tiền (nếu có)
  date: string; // ISO String
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  workerId: string;
  workerName: string;
  workerProfileImageUrl: string | null;
  employerId: string;
  employerName: string;
  employerProfileImageUrl: string | null;
  applicationDate: string; // ISO string
  status: 'pending' | 'accepted' | 'rejected' | 'hired' | 'terminated'; // Added 'terminated'
  // New fields for quick CV access
  cvUrl?: string | null;
  cvName?: string | null;
  // New fields for better application context
  introduction?: string;
  contactPhoneNumber?: string;
  
  // Employee Management Fields
  performanceScore?: number; // Điểm đánh giá (0-100)
  contractUrl?: string | null; // Link tới hợp đồng làm việc (Drive/Cloudinary)
}

export enum NotificationType {
  NEW_APPLICATION = 'NEW_APPLICATION',
  NEW_JOB_MATCH = 'NEW_JOB_MATCH',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED'
}

export interface Notification {
  id: string;
  userId: string; // The user who receives the notification
  type: NotificationType;
  message: string; // Fallback message
  translationKey?: string; // Key for i18n
  translationParams?: Record<string, any>; // Params for i18n
  link: string; // e.g., `/jobs/jobId` or `/profile`
  isRead: boolean;
  createdAt: string; // ISO String
}

export interface ConversationParticipantInfo {
  fullName: string;
  profileImageUrl: string | null;
}

export interface Conversation {
  id: string; // composite key: uid1_uid2
  participants: string[];
  participantInfo: {
    [uid: string]: ConversationParticipantInfo;
  };
  lastMessage?: string;
  lastMessageTimestamp?: string; // ISO string
  unreadCounts: {
    [uid: string]: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  status: 'sent' | 'read';
  deleted?: boolean;
}