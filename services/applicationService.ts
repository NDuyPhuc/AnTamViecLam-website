import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import type { Job, UserData, Application } from '../types';
import { createNotification } from './notificationService';
import { NotificationType } from '../types';

/**
 * Allows a worker to apply for a job.
 * Creates an application document in a top-level "applications" collection.
 * Uses a composite ID "jobId_workerId" to prevent duplicate applications.
 */
export const applyForJob = async (job: Job, worker: UserData): Promise<void> => {
  if (worker.userType !== 'WORKER') {
    throw new Error('Only workers can apply for jobs.');
  }
  if (!worker.fullName) {
    throw new Error('Worker must have a full name to apply.');
  }

  const applicationId = `${job.id}_${worker.uid}`;
  const applicationRef = doc(db, 'applications', applicationId);

  const docSnap = await getDoc(applicationRef);
  if (docSnap.exists()) {
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
  };

  await setDoc(applicationRef, applicationData);

  // Send notification to employer
  await createNotification(
    job.employerId,
    NotificationType.NEW_APPLICATION,
    `${worker.fullName} vừa ứng tuyển vào công việc: "${job.title}"`,
    `/profile`
  );
};

/**
 * Checks if a worker has already applied for a specific job.
 * Returns true if an application document exists, false otherwise.
 */
export const checkIfApplied = async (jobId: string, workerId: string): Promise<boolean> => {
  const applicationId = `${jobId}_${workerId}`;
  const applicationRef = doc(db, 'applications', applicationId);
  const docSnap = await getDoc(applicationRef);
  return docSnap.exists();
};

/**
 * Subscribes to application counts for all jobs.
 * This is more efficient than fetching counts per job.
 */
export const subscribeToAllApplicationCounts = (callback: (counts: { [jobId: string]: number }) => void) => {
    const applicationsCollection = collection(db, 'applications');
    const unsubscribe = onSnapshot(applicationsCollection, (querySnapshot) => {
        const counts: { [jobId: string]: number } = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const jobId = data.jobId;
            if (jobId) {
                counts[jobId] = (counts[jobId] || 0) + 1;
            }
        });
        callback(counts);
    }, (error) => {
        console.error("Error fetching application counts: ", error);
        callback({});
    });

    return unsubscribe;
};


/**
 * Subscribes to all applications for jobs posted by a specific employer.
 * Queries the top-level 'applications' collection.
 * Sorts on the client to avoid composite index requirements.
 */
export const subscribeToApplicationsForEmployer = (employerId: string, callback: (apps: Application[]) => void) => {
    const applicationsCollection = collection(db, 'applications');
    const q = query(
        applicationsCollection,
        where('employerId', '==', employerId)
        // orderBy('applicationDate', 'desc') // Removed to avoid composite index
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
    const applicationsCollection = collection(db, 'applications');
    const q = query(
        applicationsCollection,
        where('workerId', '==', workerId)
        // orderBy('applicationDate', 'desc') // Removed to avoid composite index
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
  status: 'accepted' | 'rejected'
): Promise<void> => {
  // Use the application's ID to find the document in the top-level collection.
  const applicationRef = doc(db, 'applications', application.id);
  await updateDoc(applicationRef, { status });

  // Notify the worker about the status change
  const notificationType = status === 'accepted' ? NotificationType.APPLICATION_ACCEPTED : NotificationType.APPLICATION_REJECTED;
  const message = status === 'accepted' 
    ? `Chúc mừng! Đơn ứng tuyển của bạn cho công việc "${application.jobTitle}" đã được chấp nhận.`
    : `Rất tiếc, đơn ứng tuyển của bạn cho công việc "${application.jobTitle}" đã bị từ chối.`;
  
  await createNotification(application.workerId, notificationType, message, '/profile');
};