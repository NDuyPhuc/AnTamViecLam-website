
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import JobCard from './components/JobCard';
import InsuranceDashboard from './components/InsuranceDashboard';
import Messaging from './components/Messaging';
import Chatbot from './components/Chatbot';
import JobDetailModal from './components/JobDetailModal';
import JobFilters from './components/JobFilters';
import MapView from './components/MapView';
import ListIcon from './components/icons/ListIcon';
import MapIcon from './components/icons/MapIcon';
import ProfilePage from './components/ProfilePage';
import PostJobModal from './components/PostJobModal';
import { View, Job, Application } from './types';
import { useAuth } from './contexts/AuthContext';
import UnauthenticatedApp from './components/UnauthenticatedApp';
import CompleteProfilePage from './components/auth/CompleteProfilePage';
import Spinner from './components/Spinner';
import { subscribeToJobs } from './services/jobService';
import { calculateDistance, parseLocationString } from './utils/formatters';
import PublicProfileModal from './components/PublicProfileModal';
import { getOrCreateConversation } from './services/messagingService';
import AdvancedJobRecommendations from './components/AdvancedJobRecommendations';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

type JobViewMode = 'list' | 'map';

const ViewToggle: React.FC<{ activeMode: JobViewMode; setMode: (mode: JobViewMode) => void }> = ({ activeMode, setMode }) => (
    <div className="flex items-center bg-gray-200 rounded-lg p-1">
        <button
            onClick={() => setMode('list')}
            className={`flex items-center justify-center w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                activeMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600'
            }`}
            aria-pressed={activeMode === 'list'}
        >
            <ListIcon className="w-4 h-4 mr-2" />
            Danh sách
        </button>
        <button
            onClick={() => setMode('map')}
            className={`flex items-center justify-center w-full px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                activeMode === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-indigo-600'
            }`}
            aria-pressed={activeMode === 'map'}
        >
            <MapIcon className="w-4 h-4 mr-2" />
            Bản đồ
        </button>
    </div>
);

const App: React.FC = () => {
  const { currentUser, currentUserData, loading } = useAuth();
  const [activeView, setActiveView] = useState<View>(View.Jobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobViewMode, setJobViewMode] = useState<JobViewMode>('list');
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{ userId: string; applicationContext?: Application } | null>(null);
  
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);


  // State for filters
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // --- HYBRID LOCATION LOGIC (Reusable) ---
  const getUserLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null); 
    
    try {
        console.log('Starting location check...');
        
        // --- LOGIC CHO MOBILE (NATIVE) ---
        if (Capacitor.isNativePlatform()) {
            // Mobile (Android/iOS): BẮT BUỘC phải xin quyền thủ công trước
            try {
                const permissions = await Geolocation.checkPermissions();
                
                if (permissions.location !== 'granted') {
                    console.log('Requesting native permissions...');
                    const requestResult = await Geolocation.requestPermissions();
                    if (requestResult.location !== 'granted') {
                        throw new Error('Quyền truy cập vị trí bị từ chối trên thiết bị.');
                    }
                }
            } catch (permError) {
                console.warn("Native permission check failed:", permError);
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
            
            console.log('Native Location found:', position.coords);
            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
        } 
        // --- LOGIC CHO WEB (BROWSER) ---
        else {
            if (!('geolocation' in navigator)) {
                throw new Error("Trình duyệt không hỗ trợ định vị.");
            }

            // [FIX] Check Permission API first to avoid console error spam and give faster feedback
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                    if (perm.state === 'denied') {
                         throw { code: 1, message: "User denied Geolocation (Permissions API)" };
                    }
                } catch(e) {
                    console.warn("Permission query failed, falling back to direct request", e);
                }
            }

            // Sử dụng Promise để bọc navigator.geolocation và hỗ trợ Fallback
            const getWebPosition = (): Promise<GeolocationPosition> => {
                return new Promise((resolve, reject) => {
                    // Thử lần 1: Độ chính xác cao
                    navigator.geolocation.getCurrentPosition(
                        resolve,
                        (errHigh) => {
                            // QUAN TRỌNG: Nếu lỗi là do người dùng TỪ CHỐI (Code 1), reject ngay.
                            if (errHigh.code === 1) {
                                console.error("Geolocation permission explicitly denied by user.");
                                reject(errHigh); 
                                return;
                            }

                            console.warn("High accuracy failed/timed out, trying low accuracy...", errHigh);
                            // Fallback chế độ thấp
                            navigator.geolocation.getCurrentPosition(
                                resolve,
                                reject,
                                { 
                                    enableHighAccuracy: false, 
                                    timeout: 10000, 
                                    maximumAge: 30000 // [FIX] Cho phép lấy cache cũ tối đa 30s nếu phần cứng đang bận
                                }
                            );
                        },
                        { 
                            enableHighAccuracy: true, 
                            timeout: 5000, 
                            maximumAge: 0 
                        }
                    );
                });
            };

            const position = await getWebPosition();
            console.log('Web Location found:', position.coords);
            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
        }

        setLocationError(null);

    } catch (e: any) {
        console.error("Location Error:", e);
        
        let msg = "Không thể lấy vị trí. Vui lòng thử lại.";
        
        // Xử lý lỗi code từ Geolocation API (1: Denied, 2: Unavailable, 3: Timeout)
        if (e.code === 1) { 
             if (Capacitor.isNativePlatform()) {
                 msg = "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong Cài đặt điện thoại.";
             } else {
                 // [FIX] Cập nhật thông báo chi tiết hơn cho người dùng Web
                 msg = "Quyền vị trí chưa được cấp. Vui lòng kiểm tra:\n1. Biểu tượng ổ khóa 🔒 trên thanh địa chỉ -> Chọn 'Cho phép'.\n2. Cài đặt Vị trí (Location Services) của máy tính/điện thoại.";
             }
        }
        else if (e.code === 2) msg = "Không tìm thấy tín hiệu GPS. Hãy kiểm tra kết nối mạng."; 
        else if (e.code === 3) msg = "Quá thời gian lấy vị trí."; 
        else if (e.message) msg = e.message;

        setUserLocation(prev => {
            // Chỉ set lỗi nếu chưa có vị trí (tránh ghi đè nếu đã có)
            if (!prev) setLocationError(msg);
            return prev;
        });
    } finally {
        setIsLocating(false);
    }
  }, []);

  // --- NEW: Improved Web Permission API Listener ---
  useEffect(() => {
    // Skip on Native platforms as they handle permissions differently
    if (Capacitor.isNativePlatform()) return;

    // Check for browser support
    if (!navigator.permissions || !navigator.permissions.query) return;

    let mounted = true;

    const setupPermissionListener = async () => {
        try {
            const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            
            if (!mounted) return;

            console.log("Initial permission status:", status.state);
            
            const handlePermissionChange = () => {
                if (!mounted) return;
                console.log("Permission changed to:", status.state);
                
                if (status.state === 'granted') {
                    // Auto-recover: Clear error and fetch location immediately
                    setLocationError(null);
                    getUserLocation();
                } else if (status.state === 'prompt') {
                    // Reset: Clear error so UI is clean, user can click "Retry" or "My Location" button
                    setLocationError(null);
                } else if (status.state === 'denied') {
                    // Blocked: Show error immediately
                    setLocationError("Quyền vị trí đã bị chặn. Vui lòng nhấp vào biểu tượng ổ khóa 🔒 và chọn 'Đặt lại quyền' (Reset).");
                }
            };

            // Listen for changes
            status.addEventListener('change', handlePermissionChange);
            
            // Return cleanup function for the listener
            return () => {
                status.removeEventListener('change', handlePermissionChange);
            };
        } catch (err) {
            console.debug("Permissions API check failed:", err);
        }
    };

    // Initialize
    const cleanupPromise = setupPermissionListener();

    return () => {
        mounted = false;
        cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [getUserLocation]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    // Service Worker registration (Web only)
    if ('serviceWorker' in navigator && !isNative) {
      window.addEventListener('load', () => {
        const swUrl = `${window.location.origin}/sw.js`;
        navigator.serviceWorker.register(swUrl)
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Initial Location Fetch
    getUserLocation();

    // --- APP STATE LISTENER (AUTO-REFRESH LOCATION ON RESUME) ---
    // Tự động lấy lại vị trí khi người dùng quay lại App
    let appListener: any;
    const setupAppListener = async () => {
        try {
            appListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    console.log('App resumed (isActive: true), re-checking location...');
                    getUserLocation();
                }
            });
            console.log('App State Listener registered.');
        } catch (err) {
            console.warn('App State Listener failed to register:', err);
        }
    };
    setupAppListener();

    setJobsLoading(true);
    const unsubscribeJobs = subscribeToJobs((jobs) => {
      setAllJobs(jobs);
      setJobsLoading(false);
    });
    
    // Cleanup
    return () => {
        unsubscribeJobs();
        if (appListener) {
            appListener.remove();
        }
    };
  }, [getUserLocation]); 

  const handleSelectJobForDetail = (job: Job) => {
    setSelectedJob(job);
  };

  const handleViewJobOnMap = (jobToView: Job) => {
    if (!jobToView) return;
    setSelectedJob(null); // Close modal if open
    setActiveView(View.Jobs); // Switch to Jobs View
    setJobViewMode('map'); // Switch to Map Mode
    setFocusedJobId(jobToView.id); // Focus on the job
  };

  const handleNavigateToConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setActiveView(View.Messaging);
  };

  const handleStartConversationWithUser = async (application: Application) => {
      if (!application) return;
      try {
        const conversationId = await getOrCreateConversation(application);
        if (viewingProfile) setViewingProfile(null); // Close profile modal
        handleNavigateToConversation(conversationId);
      } catch (error) {
          console.error("Failed to start conversation:", error);
          alert("Không thể bắt đầu cuộc trò chuyện.");
      }
  };

  const handleFocusComplete = () => {
    setFocusedJobId(null);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
  };

  const handleResetFilters = () => {
    setLocationFilter('');
    setTypeFilter('');
  };

  const handleNotificationNavigate = (link: string) => {
    if (link.startsWith('/jobs/')) {
        const jobId = link.split('/jobs/')[1];
        const job = allJobs.find(j => j.id === jobId);
        if (job) {
            setSelectedJob(job);
        }
    } else if (link === '/profile') {
        setActiveView(View.Profile);
    }
  };


  const { uniqueLocations, uniqueTypes, filteredJobs } = useMemo(() => {
    const openJobs = allJobs.filter(job => job.status === 'OPEN');

    const jobsWithDistance = userLocation
      ? openJobs.map(job => {
          const jobCoords = parseLocationString(job.location);
          if (jobCoords) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              jobCoords.lat,
              jobCoords.lng
            );
            return { ...job, distance };
          }
          return job;
        })
      : openJobs;

    const locations = [...new Set(jobsWithDistance.map(job => job.addressString))];
    const types = [...new Set(jobsWithDistance.map(job => job.jobType).filter(Boolean))];

    let jobs = jobsWithDistance;

    if (locationFilter) {
      jobs = jobs.filter(job => job.addressString === locationFilter);
    }
    if (typeFilter) {
      jobs = jobs.filter(job => job.jobType === typeFilter);
    }

    // Sort by distance if location is available
    if (userLocation) {
        jobs.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    
    return {
      uniqueLocations: locations as string[],
      uniqueTypes: types as string[],
      filteredJobs: jobs
    };
  }, [allJobs, locationFilter, typeFilter, userLocation]);

  const renderContent = () => {
    const contentKey = activeView;
    return (
       <div key={contentKey} className="animate-fade-in-up" style={{ animationDuration: '0.4s' }}>
            {(() => {
                 switch (activeView) {
                    case View.Jobs:
                        return (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <h2 className="text-3xl font-bold text-gray-800">Tìm kiếm việc làm</h2>
                            <ViewToggle activeMode={jobViewMode} setMode={setJobViewMode} />
                            </div>
                            
                            <JobFilters 
                            locations={uniqueLocations}
                            types={uniqueTypes}
                            locationFilter={locationFilter}
                            typeFilter={typeFilter}
                            onLocationChange={setLocationFilter}
                            onTypeChange={setTypeFilter}
                            onReset={handleResetFilters}
                            />

                            {/* LOCATION ERROR ALERT WITH SMART ACTIONS */}
                            {locationError && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-sm">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MapIcon className="w-5 h-5 text-red-600" />
                                            <p className="font-bold">Cần quyền truy cập vị trí</p>
                                        </div>
                                        <p className="text-sm opacity-90 whitespace-pre-line">{locationError}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            // Trigger retry
                                            getUserLocation();
                                        }}
                                        disabled={isLocating}
                                        className="bg-white border border-red-200 hover:bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center shrink-0 disabled:opacity-50 shadow-sm"
                                    >
                                        {isLocating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Đang thử lại...
                                            </>
                                        ) : (
                                            'Thử lại ngay'
                                        )}
                                    </button>
                                </div>
                            )}

                            {jobViewMode === 'list' && (
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-gray-800 pt-4">Việc làm khả dụng</h3>
                                {jobsLoading ? <Spinner message="Đang tải công việc..."/> : filteredJobs.length > 0 ? (
                                    filteredJobs.map((job) => (
                                    <JobCard 
                                        key={job.id} 
                                        job={job} 
                                        onClick={() => handleSelectJobForDetail(job)} 
                                        applicantCount={job.applicantCount || 0}
                                    />
                                    ))
                                ) : (
                                    <div className="text-center py-16 px-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600">Không tìm thấy công việc nào phù hợp với bộ lọc của bạn.</p>
                                    </div>
                                )}
                            </div>
                            )}

                            {jobViewMode === 'map' && (
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800 pt-4 mb-4">Vị trí công việc</h3>
                                    {jobsLoading ? <Spinner /> : (
                                      <MapView 
                                          jobs={filteredJobs} 
                                          onJobSelect={handleSelectJobForDetail}
                                          focusedJobId={focusedJobId}
                                          onFocusComplete={handleFocusComplete}
                                          userLocation={userLocation}
                                      />
                                    )}
                                </div>
                            )}

                        </div>
                        );
                    case View.Recommendations:
                        return (
                            <AdvancedJobRecommendations 
                                userLocation={userLocation}
                                allJobs={allJobs}
                                currentUserData={currentUserData!}
                                onViewOnMap={handleViewJobOnMap}
                                onJobSelect={handleSelectJobForDetail}
                            />
                        );
                    case View.Insurance:
                        return <InsuranceDashboard />;
                    case View.Messaging:
                        return (
                            <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
                                <Messaging
                                    initialSelectedConversationId={selectedConversationId}
                                    clearInitialSelection={() => setSelectedConversationId(null)}
                                />
                            </div>
                        );
                    case View.Chatbot:
                        return (
                            <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
                                <Chatbot allJobs={filteredJobs} />
                            </div>
                        );
                    case View.Profile:
                        return <ProfilePage 
                            onViewProfile={(userId, application) => setViewingProfile({userId, applicationContext: application})} 
                            onJobSelect={handleSelectJobForDetail}
                        />;
                    default:
                        return null;
                }
            })()}
       </div>
    );
  };
  
  if (loading) {
    return <Spinner fullScreen message="Đang tải ứng dụng..." />;
  }
  
  if (!currentUser) {
    return <UnauthenticatedApp />;
  }

  if (!currentUserData || !currentUserData.fullName) {
    return <CompleteProfilePage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      <Header 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onPostJobClick={() => setIsPostJobModalOpen(true)}
        onNotificationNavigate={handleNotificationNavigate} 
      />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-28 md:pb-10">
        {renderContent()}
      </main>
      {selectedJob && <JobDetailModal job={selectedJob} onClose={handleCloseModal} onViewOnMap={() => handleViewJobOnMap(selectedJob)} />}
      {isPostJobModalOpen && <PostJobModal onClose={() => setIsPostJobModalOpen(false)} userLocation={userLocation} />}
      {viewingProfile && (
        <PublicProfileModal 
            userId={viewingProfile.userId} 
            application={viewingProfile.applicationContext}
            onClose={() => setViewingProfile(null)}
            onStartChat={viewingProfile.applicationContext ? () => handleStartConversationWithUser(viewingProfile.applicationContext!) : undefined}
        />
      )}
    </div>
  );
};

export default App;
