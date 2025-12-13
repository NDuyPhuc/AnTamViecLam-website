
import { db, serverTimestamp, increment } from './firebase';
import type { Job, UserData, Application, EmploymentLog, LogType } from '../types';
import { createNotification } from './notificationService';
import { NotificationType } from '../types';

/**
 * Allows a worker to apply for a job.
 * Creates an application document in a top-level "applications" collection.
 * Uses a composite ID "jobId_workerId" to prevent duplicate applications.
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

      // FIX QUAN TRỌNG: Tách Batch thành 2 lệnh riêng biệt.
      // 1. Tạo Application (QUAN TRỌNG NHẤT) - Nếu cái này thành công, coi như ứng tuyển thành công.
      await applicationRef.set(applicationData);

      // 2. Tăng số lượng ứng viên (PHỤ) - Nếu lỗi quyền (permission denied) thì bỏ qua, không chặn luồng chính.
      try {
          const jobRef = db.collection('jobs').doc(job.id);
          await jobRef.update({
              applicantCount: increment(1)
          });
      } catch (countError) {
          console.warn("Warning: Could not increment applicant count due to permissions. Ignoring...", countError);
      }

      // Send notification to employer
      createNotification(
        job.employerId,
        NotificationType.NEW_APPLICATION,
        `${worker.fullName} vừa ứng tuyển vào công việc: "${job.title}"`,
        `/profile`
      ).catch(err => console.error("Failed to send notification", err));

  } catch (error: any) {
      console.error("Apply Job Error Details:", error);
      throw error;
  }
};

/**
 * Checks if a worker has already applied for a specific job.
 * Returns true if an application document exists, false otherwise.
 */
export const checkIfApplied = async (jobId: string, workerId: string): Promise<boolean> => {
  const applicationId = `${jobId}_${workerId}`;
  const applicationRef = db.collection('applications').doc(applicationId);
  const docSnap = await applicationRef.get();
  return docSnap.exists;
};

/**
 * Subscribes to all applications for jobs posted by a specific employer.
 * Queries the top-level 'applications' collection.
 * Sorts on the client to avoid composite index requirements.
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
        
        // Sort client-side by date, newest first
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
 * Sorts on the client to avoid composite index requirements.
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

        // Sort client-side by date, newest first
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
  // Use the application's ID to find the document in the top-level collection.
  const applicationRef = db.collection('applications').doc(application.id);
  await applicationRef.update({ status });

  // Notify the worker about the status change
  let notificationType = NotificationType.APPLICATION_ACCEPTED;
  let message = '';
  let link = '/profile';

  switch (status) {
      case 'accepted':
          message = `Chúc mừng! Hồ sơ của bạn cho công việc "${application.jobTitle}" đã được duyệt sơ bộ. Nhà tuyển dụng sẽ liên hệ sớm.`;
          break;
      case 'rejected':
          notificationType = NotificationType.APPLICATION_REJECTED;
          message = `Rất tiếc, đơn ứng tuyển của bạn cho công việc "${application.jobTitle}" chưa phù hợp lúc này.`;
          break;
      case 'hired':
          message = `TUYỆT VỜI! Bạn đã được tuyển dụng chính thức cho công việc "${application.jobTitle}". Kiểm tra sổ BHXH ngay!`;
          link = '/insurance';
          break;
      case 'terminated':
          notificationType = NotificationType.APPLICATION_REJECTED; // Reuse red styling
          message = `Hợp đồng công việc "${application.jobTitle}" đã kết thúc.`;
          break;
  }
  
  await createNotification(application.workerId, notificationType, message, link);

  // If hired, add an initial log
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
    
    // Construct payload safely to avoid "Unsupported field value: undefined"
    const payload: any = {
        type,
        title,
        description,
        date: serverTimestamp()
    };

    // Only add amount if it's defined (not undefined)
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
