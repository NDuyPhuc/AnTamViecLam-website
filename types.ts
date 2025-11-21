

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
  location: string; // Changed from coordinates

  payRate: number | "Thỏa thuận";
  payType: 'THEO GIỜ' | 'THEO NGÀY' | 'THEO THÁNG';
  jobType?: 'Thời vụ' | 'Bán thời gian' | 'Linh hoạt' | 'Toàn thời gian';
  
  status: 'OPEN' | 'CLOSED';
  createdAt: string; // Firestore Timestamp converted to ISO string
  hiredWorkerId: string | null;

  distance?: number; // Distance in km from the user
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
  status: 'pending' | 'accepted' | 'rejected';
  // New fields for quick CV access
  cvUrl?: string | null;
  cvName?: string | null;
}

export enum NotificationType {
  NEW_APPLICATION = 'NEW_APPLICATION',
  NEW_JOB_MATCH = 'NEW_JOB_MATCH',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
}

export interface Notification {
  id: string;
  userId: string; // The user who receives the notification
  type: NotificationType;
  message: string;
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