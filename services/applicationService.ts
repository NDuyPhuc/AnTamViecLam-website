
import { db, serverTimestamp, increment } from './firebase';
import type { Job, UserData, Application, EmploymentLog, LogType } from '../types';
import { createNotification } from './notificationService';
import { NotificationType } from '../types';
import i18n from '../i18n'; // Import i18n instance

/**
 * Allows a worker to apply for a job.
 */
export const applyForJob = async (
    job: Job, 
    worker: UserData,
    introduction: string = '',
    contactPhoneNumber: string = ''
): Promise<void> => {
  if (worker.userType !== 'WORKER') {
    throw new Error('Only workers can apply for jobs.');
  }
  if (!worker.fullName) {
    throw new Error('Worker must have a full name to apply.');
  }

  const applicationId = `${job.id}_${worker.uid}`;
  const applicationRef = db.collection('applications').doc(applicationId);

  try {
      // Check existence first
      // Note: With the new Firestore Rules, this will return doc.exists = false if not found,
      // instead of throwing "Insufficient Permissions".
      const docSnap = await applicationRef.get();
      if (docSnap.exists) {
        throw new Error('You have already applied for this job.');
      }

      const applicationData = {
        jobId: job.id,
        jobTitle: job.title,
        workerId: worker.uid,
        workerName: worker.fullName,
        workerProfileImageUrl: worker.profileImageUrl || null,
        employerId: job.employerId,
        employerName: job.employerName,
        employerProfileImageUrl: job.employerProfileUrl || null,
        applicationDate: serverTimestamp(),
        status: 'pending',
        cvUrl: worker.cvUrl || null,
        cvName: worker.cvName || null,
        introduction: introduction,
        contactPhoneNumber: contactPhoneNumber || worker.phoneNumber || '',
        performanceScore: 50,
      };

      // 1. Create Application
      await applicationRef.set(applicationData);

      // 2. Increment Applicant Count (Safely)
      try {
          const jobRef = db.collection('jobs').doc(job.id);
          await jobRef.update({
              applicantCount: increment(1)
          });
      } catch (countError) {
          console.warn("Warning: Could not increment applicant count. This does not affect the application.", countError);
      }

      // Send notification to employer
      // Using i18n.t directly. Since this runs on client side, it uses the current language.
      // Ideally notifications should be language agnostic or stored with keys, but for now we translate on creation.
      createNotification(
        job.employerId,
        NotificationType.NEW_APPLICATION,
        i18n.t('notifications.msg_new_app', { workerName: worker.fullName, jobTitle: job.title }),
        `/profile`
      ).catch(err => console.error("Failed to send notification", err));

  } catch (error: any) {
      console.error("Apply Job Error Details:", error);
      throw error;
  }
};

/**
 * Checks if a worker has already applied for a specific job.
 */
export const checkIfApplied = async (jobId: string, workerId: string): Promise<boolean> => {
  const applicationId = `${jobId}_${workerId}`;
  const applicationRef = db.collection('applications').doc(applicationId);
  try {
      const docSnap = await applicationRef.get();
      return docSnap.exists;
  } catch (error) {
      // If permission denied or other error, assume false to allow UI to show button
      // (The actual apply action might fail if it's a real permission issue, but this unblocks the UI check)
      console.warn("Error checking application status:", error);
      return false;
  }
};

/**
 * Subscribes to all applications for jobs posted by a specific employer.
 */
export const subscribeToApplicationsForEmployer = (employerId: string, callback: (apps: Application[]) => void) => {
    const applicationsCollection = db.collection('applications');
    const q = applicationsCollection.where('employerId', '==', employerId);

    const unsubscribe = q.onSnapshot((querySnapshot) => {
        const applications: Application[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const applicationDate = data.applicationDate?.toDate 
                ? data.applicationDate.toDate().toISOString() 
                : new Date().toISOString();
            
            const application: Application = {
                id: doc.id,
                jobId: data.jobId,
                jobTitle: data.jobTitle,
                workerId: data.workerId,
                workerName: data.workerName,
                employerName: data.employerName || 'Không rõ',
                workerProfileImageUrl: data.workerProfileImageUrl,
                employerId: data.employerId,
                employerProfileImageUrl: data.employerProfileImageUrl,
                applicationDate: applicationDate,
                status: data.status,
                cvUrl: data.cvUrl || null,
                cvName: data.cvName || null,
                introduction: data.introduction || '',
                contactPhoneNumber: data.contactPhoneNumber || '',
                performanceScore: data.performanceScore || 50,
                contractUrl: data.contractUrl || null,
            };
            applications.push(application);
        });
        
        applications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
        callback(applications);
    }, (error) => {
        console.error("Error fetching employer applications: ", error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * Subscribes to all applications submitted by a specific worker.
 */
export const subscribeToApplicationsForWorker = (workerId: string, callback: (apps: Application[]) => void) => {
    const applicationsCollection = db.collection('applications');
    const q = applicationsCollection.where('workerId', '==', workerId);

    const unsubscribe = q.onSnapshot((querySnapshot) => {
        const applications: Application[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const applicationDate = data.applicationDate?.toDate
                ? data.applicationDate.toDate().toISOString()
                : new Date().toISOString();
            
            const application: Application = {
                id: doc.id,
                jobId: data.jobId,
                jobTitle: data.jobTitle,
                workerId: data.workerId,
                workerName: data.workerName,
                employerName: data.employerName || 'Không rõ',
                workerProfileImageUrl: data.workerProfileImageUrl,
                employerId: data.employerId,
                employerProfileImageUrl: data.employerProfileImageUrl,
                applicationDate: applicationDate,
                status: data.status,
                cvUrl: data.cvUrl || null,
                cvName: data.cvName || null,
                introduction: data.introduction || '',
                contactPhoneNumber: data.contactPhoneNumber || '',
                performanceScore: data.performanceScore || 50,
                contractUrl: data.contractUrl || null,
            };
            applications.push(application);
        });

        applications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
        callback(applications);
    }, (error) => {
        console.error("Error fetching worker applications: ", error);
        callback([]);
    });

    return unsubscribe;
};


/**
 * Updates the status of a specific application and notifies the worker.
 */
export const updateApplicationStatus = async (
  application: Application,
  status: 'accepted' | 'rejected' | 'hired' | 'terminated'
): Promise<void> => {
  const applicationRef = db.collection('applications').doc(application.id);
  await applicationRef.update({ status });

  let notificationType = NotificationType.APPLICATION_ACCEPTED;
  let message = '';
  let link = '/profile';

  switch (status) {
      case 'accepted':
          message = i18n.t('notifications.msg_accepted', { jobTitle: application.jobTitle });
          break;
      case 'rejected':
          notificationType = NotificationType.APPLICATION_REJECTED;
          message = i18n.t('notifications.msg_rejected', { jobTitle: application.jobTitle });
          break;
      case 'hired':
          message = i18n.t('notifications.msg_hired', { jobTitle: application.jobTitle });
          link = '/insurance';
          break;
      case 'terminated':
          notificationType = NotificationType.APPLICATION_REJECTED; 
          message = i18n.t('notifications.msg_terminated', { jobTitle: application.jobTitle });
          break;
  }
  
  await createNotification(application.workerId, notificationType, message, link);

  if (status === 'hired') {
      await addEmploymentLog(application.id, 'HIRED', 'Bắt đầu làm việc', 'Chào mừng nhân viên mới!');
  }
};


// --- EMPLOYEE MANAGEMENT FUNCTIONS ---

export const addEmploymentLog = async (
    applicationId: string, 
    type: LogType, 
    title: string, 
    description: string = '', 
    amount?: number
): Promise<void> => {
    const logsRef = db.collection('applications').doc(applicationId).collection('logs');
    
    const payload: any = {
        type,
        title,
        description,
        date: serverTimestamp()
    };

    if (amount !== undefined && amount !== null) {
        payload.amount = amount;
    }

    await logsRef.add(payload);
};

export const getEmploymentLogs = async (applicationId: string): Promise<EmploymentLog[]> => {
    const logsRef = db.collection('applications').doc(applicationId).collection('logs').orderBy('date', 'desc');
    const snapshot = await logsRef.get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: data.type,
            title: data.title,
            description: data.description,
            amount: data.amount,
            date: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString()
        };
    });
};

export const updatePerformanceScore = async (applicationId: string, change: number): Promise<void> => {
    const appRef = db.collection('applications').doc(applicationId);
    await appRef.update({
        performanceScore: increment(change)
    });
};

export const updateContractUrl = async (applicationId: string, url: string): Promise<void> => {
    const appRef = db.collection('applications').doc(applicationId);
    await appRef.update({
        contractUrl: url
    });
};

export const terminateEmployee = async (application: Application, reason: string = 'Hoàn thành công việc hoặc thôi việc'): Promise<void> => {
    await updateApplicationStatus(application, 'terminated');
    await addEmploymentLog(application.id, 'TERMINATION', 'Chấm dứt hợp đồng', reason);
};
