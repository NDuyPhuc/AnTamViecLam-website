import { collection, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, where, updateDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Job, UserData, UserRole } from '../types';
import { NotificationType } from '../types';
import { createNotification } from './notificationService';

export const subscribeToJobs = (callback: (jobs: Job[]) => void) => {
  const jobsCollection = collection(db, 'jobs');
  const q = query(jobsCollection, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const jobs: Job[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure all necessary fields exist to prevent runtime errors
      if (data.title && data.location) {
        // Convert Firestore Timestamp to ISO string to prevent serialization issues.
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();

        const job: Job = {
          id: doc.id,
          title: data.title,
          description: data.description || '',
          employerId: data.employerId,
          employerName: data.employerName,
          employerProfileUrl: data.employerProfileUrl,
          addressString: data.addressString,
          location: data.location,
          payRate: data.payRate,
          payType: data.payType,
          jobType: data.jobType || 'Thời vụ',
          status: data.status,
          createdAt: createdAt, // Use the serializable ISO string
          hiredWorkerId: data.hiredWorkerId,
        };
        jobs.push(job);
      }
    });
    callback(jobs);
  }, (error) => {
    console.error("Error fetching jobs: ", error);
    callback([]); // Return empty array on error
  });

  return unsubscribe;
};

export const subscribeToJobsByEmployer = (employerId: string, callback: (jobs: Job[]) => void) => {
  const jobsCollection = collection(db, 'jobs');
  const q = query(jobsCollection, where('employerId', '==', employerId), orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const jobs: Job[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      
      // Explicitly construct the Job object to avoid circular references from ...data
      const job: Job = {
        id: doc.id,
        title: data.title,
        description: data.description,
        employerId: data.employerId,
        employerName: data.employerName,
        employerProfileUrl: data.employerProfileUrl,
        addressString: data.addressString,
        location: data.location,
        payRate: data.payRate,
        payType: data.payType,
        jobType: data.jobType,
        status: data.status,
        createdAt: createdAt,
        hiredWorkerId: data.hiredWorkerId,
      };
      jobs.push(job);
    });
    callback(jobs);
  }, (error) => {
    console.error("Error fetching employer jobs: ", error);
    callback([]);
  });

  return unsubscribe;
};

export const updateJobStatus = async (jobId: string, status: 'OPEN' | 'CLOSED') => {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, { status });
};


// Update NewJobData to accept coordinates, which we'll convert to a location string
type NewJobData = Omit<Job, 'id' | 'createdAt' | 'employerId' | 'employerName' | 'employerProfileUrl' | 'status' | 'hiredWorkerId' | 'location'> & {
    coordinates: { lat: number; lng: number };
};

const notifyMatchingWorkers = async (jobId: string, jobData: NewJobData) => {
    // This is a simplified matching logic. For a large-scale app, this should be handled by a backend service (e.g., Firebase Functions)
    // to avoid querying all users on the client side.
    const jobProvince = jobData.addressString.split(',').pop()?.trim();
    if (!jobProvince) return;
  
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("userType", "==", "WORKER"));
  
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const worker = doc.data() as UserData;
        if (worker.address && worker.address.includes(jobProvince)) {
          createNotification(
            worker.uid,
            NotificationType.NEW_JOB_MATCH,
            `Việc làm mới tại ${jobProvince}: "${jobData.title}"`,
            `/jobs/${jobId}`
          );
        }
      });
    } catch (error) {
      console.error("Error notifying workers:", error);
    }
};

export const addJob = async (jobData: NewJobData, employer: UserData) => {
  if (!employer.fullName) {
    throw new Error("Nhà tuyển dụng phải có họ tên đầy đủ để đăng tin.");
  }
  
  const jobsCollection = collection(db, 'jobs');
  const newDocRef = doc(jobsCollection); 

  const { coordinates, ...restOfJobData } = jobData;
  const locationString = `[${coordinates.lat}° N, ${coordinates.lng}° E]`;

  const newJob = {
    ...restOfJobData,
    id: newDocRef.id,
    employerId: employer.uid,
    employerName: employer.fullName,
    employerProfileUrl: employer.profileImageUrl || null,
    status: 'OPEN',
    hiredWorkerId: null,
    createdAt: serverTimestamp(),
    location: locationString,
  }

  await setDoc(newDocRef, newJob);

  // After job is successfully added, find and notify matching workers
  await notifyMatchingWorkers(newDocRef.id, jobData);
};