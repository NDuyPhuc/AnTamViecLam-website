import { db, serverTimestamp } from './firebase';
import type { Job, UserData, UserRole } from '../types';
import { NotificationType } from '../types';
import { createNotification } from './notificationService';

export const subscribeToJobs = (callback: (jobs: Job[]) => void) => {
  const jobsCollection = db.collection('jobs');
  
  // FIX: Filter by status 'OPEN' to satisfy Firestore Security Rules (often allow list if status == 'OPEN')
  // We also remove .orderBy('createdAt', 'desc') from the query to avoid "Composite Index" errors.
  // We will sort the results on the client side instead.
  const q = jobsCollection.where('status', '==', 'OPEN');

  const unsubscribe = q.onSnapshot((querySnapshot) => {
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
          applicantCount: data.applicantCount || 0,
        };
        jobs.push(job);
      }
    });
    
    // Sort client-side by createdAt descending (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    callback(jobs);
  }, (error) => {
    console.error("Error fetching jobs: ", error);
    // Return empty array on error to prevent app crash
    callback([]); 
  });

  return unsubscribe;
};

export const subscribeToJobsByEmployer = (employerId: string, callback: (jobs: Job[]) => void) => {
  const jobsCollection = db.collection('jobs');
  // Filter by employerId is standard and usually allowed by rules for the owner
  // Removed orderBy to avoid index requirement
  const q = jobsCollection.where('employerId', '==', employerId);

  const unsubscribe = q.onSnapshot((querySnapshot) => {
    const jobs: Job[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      
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
        applicantCount: data.applicantCount || 0,
      };
      jobs.push(job);
    });
    
    // Sort client-side by createdAt descending
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    callback(jobs);
  }, (error) => {
    console.error("Error fetching employer jobs: ", error);
    callback([]);
  });

  return unsubscribe;
};

export const getJobById = async (jobId: string): Promise<Job | null> => {
    try {
        const docRef = db.collection('jobs').doc(jobId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            
            return {
                id: doc.id,
                title: data?.title,
                description: data?.description || '',
                employerId: data?.employerId,
                employerName: data?.employerName,
                employerProfileUrl: data?.employerProfileUrl,
                addressString: data?.addressString,
                location: data?.location,
                payRate: data?.payRate,
                payType: data?.payType,
                jobType: data?.jobType || 'Thời vụ',
                status: data?.status,
                createdAt: createdAt,
                hiredWorkerId: data?.hiredWorkerId,
                applicantCount: data?.applicantCount || 0,
            } as Job;
        }
        return null;
    } catch (error) {
        console.error("Error fetching job by ID:", error);
        return null;
    }
};

export const updateJobStatus = async (jobId: string, status: 'OPEN' | 'CLOSED') => {
    const jobRef = db.collection('jobs').doc(jobId);
    await jobRef.update({ status });
};


// Update NewJobData to accept coordinates, which we'll convert to a location string
type NewJobData = Omit<Job, 'id' | 'createdAt' | 'employerId' | 'employerName' | 'employerProfileUrl' | 'status' | 'hiredWorkerId' | 'location' | 'applicantCount'> & {
    coordinates: { lat: number; lng: number };
};

const notifyMatchingWorkers = async (jobId: string, jobData: NewJobData) => {
    // This is a simplified matching logic. For a large-scale app, this should be handled by a backend service (e.g., Firebase Functions)
    // to avoid querying all users on the client side.
    const jobProvince = jobData.addressString.split(',').pop()?.trim();
    if (!jobProvince) return;
  
    const usersRef = db.collection("users");
    const q = usersRef.where("userType", "==", "WORKER");
  
    try {
      const querySnapshot = await q.get();
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
  
  const jobsCollection = db.collection('jobs');
  const newDocRef = jobsCollection.doc(); 

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
    applicantCount: 0,
  }

  await newDocRef.set(newJob);

  // After job is successfully added, find and notify matching workers
  await notifyMatchingWorkers(newDocRef.id, jobData);
};