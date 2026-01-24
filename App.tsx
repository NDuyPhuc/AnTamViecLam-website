
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import ArrowLeftIcon from './components/icons/ArrowLeftIcon';
import ArrowRightIcon from './components/icons/ArrowRightIcon';
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
import { useTranslation } from 'react-i18next';

type JobViewMode = 'list' | 'map';

const ITEMS_PER_PAGE = 10;

const ViewToggle: React.FC<{ activeMode: JobViewMode; setMode: (mode: JobViewMode) => void }> = ({ activeMode, setMode }) => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center bg-gray-100/80 p-1 rounded-lg shadow-inner border border-gray-200/50">
            <button
                onClick={() => setMode('list')}
                className={`relative flex items-center justify-center px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-300 ease-out select-none ${
                    activeMode === 'list' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-700 bg-transparent'
                }`}
            >
                <ListIcon className={`w-4 h-4 mr-1.5 transition-transform duration-300 ${activeMode === 'list' ? 'scale-110' : ''}`} />
                {t('map.list_view')}
            </button>
            <button
                onClick={() => setMode('map')}
                className={`relative flex items-center justify-center px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-300 ease-out select-none ${
                    activeMode === 'map' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                        : 'text-gray-500 hover:text-gray-700 bg-transparent'
                }`}
            >
                <MapIcon className={`w-4 h-4 mr-1.5 transition-transform duration-300 ${activeMode === 'map' ? 'scale-110' : ''}`} />
                {t('map.map_view')}
            </button>
        </div>
    );
};

const App: React.FC = () => {
  const { t } = useTranslation();
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // State for filters
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Update document title when language changes
  useEffect(() => {
      document.title = t('app_name');
  }, [t]);

  // Bảo mật: Tự động đóng modal đăng tin nếu user mất trạng thái verified (realtime)
  useEffect(() => {
      if (isPostJobModalOpen && currentUserData?.kycStatus !== 'verified') {
          setIsPostJobModalOpen(false);
      }
  }, [currentUserData, isPostJobModalOpen]);

  // --- HYBRID LOCATION LOGIC (Strict Separation & Robust Fallback) ---
  const getUserLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null); 
    
    const isNative = Capacitor.isNativePlatform();

    try {
        console.log(`Starting location check... (Platform: ${isNative ? 'Native' : 'Web'})`);
        
        if (isNative) {
            // NATIVE LOGIC
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    throw { code: 1, message: t('map.error_permission_denied_native') };
                }
            }
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });

        } else {
            // WEB BROWSER LOGIC (Robust Implementation)
            if (!navigator.geolocation) {
                throw new Error(t('map.error_browser_support'));
            }

            // [FIX] Check Permissions API first to avoid instant failure loop
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                    if (result.state === 'denied') {
                        throw { code: 1, message: 'PermissionDeniedByBrowserSettings' };
                    }
                } catch (permErr) {
                    console.debug("Permissions API not fully supported or error:", permErr);
                    // Continue to try standard geolocation if this check fails/isn't supported
                }
            }

            // Helper to wrap geolocation in Promise
            const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, options);
                });
            };

            let position: GeolocationPosition;

            try {
                // Try 1: High Accuracy (GPS), Timeout increased to 12s
                // Warning: mobile browsers often throttle this if screen is dim or tab is background
                position = await getPosition({ 
                    enableHighAccuracy: true, 
                    timeout: 12000, 
                    maximumAge: 0 
                });
                console.log("Got High Accuracy Position");
            } catch (err: any) {
                console.warn("High Accuracy Location failed, trying fallback...", err.message);
                
                // If permission denied explicitly (Code 1), stop immediately. Do not try fallback.
                if (err.code === 1) throw err;

                // Try 2: Low Accuracy (Wifi/IP) + Accept Cached Position (Infinity)
                // This is crucial for fixing "Vercel hosted" issues where GPS is flaky
                position = await getPosition({ 
                    enableHighAccuracy: false, 
                    timeout: 15000, 
                    maximumAge: Infinity 
                });
                console.log("Got Low Accuracy/Cached Position");
            }

            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            });
        }

    } catch (e: any) {
        console.error("Location Error:", e);
        
        let msg = t('map.error_generic');
        
        if (e.code === 1) { 
             // IMPORTANT: Distinguish between Native and Web permission denial
             if (isNative) {
                 msg = t('map.error_permission_denied_native');
             } else {
                 // Instruction for Web User to unblock
                 msg = t('map.error_permission_denied');
             }
        }
        else if (e.code === 2) msg = t('map.error_gps_off'); 
        else if (e.code === 3) msg = t('map.error_timeout'); 
        else if (e.message) msg = e.message;

        setUserLocation(prev => {
            // Only set error if we don't have a previous location
            if (!prev) setLocationError(msg);
            return prev;
        });
    } finally {
        setIsLocating(false);
    }
  }, [t]);

  // --- Web Permission Listener (Auto-Recovery) ---
  useEffect(() => {
    // Only run on Web
    if (Capacitor.isNativePlatform()) return;

    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
            .then((permissionStatus) => {
                const handlePermissionChange = () => {
                    console.log("Permission state changed to:", permissionStatus.state);
                    if (permissionStatus.state === 'granted') {
                        setLocationError(null);
                        getUserLocation();
                    }
                };
                permissionStatus.onchange = handlePermissionChange;
            })
            .catch(err => console.debug("Permissions API check skipped:", err));
    }
  }, [getUserLocation]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();

    // Service Worker registration (Web only)
    if ('serviceWorker' in navigator && !isNative) {
        const swUrl = `/sw.js`;
        const registerSW = () => {
             navigator.serviceWorker.register(swUrl).catch(() => {});
        };
        if (document.visibilityState !== 'visible' || document.readyState === 'loading') {
             window.addEventListener('load', registerSW);
        } else {
             registerSW();
        }
    }

    // Initial Location Fetch
    if (currentUser) {
        setLocationError(null);
        getUserLocation();
    }

    // --- APP STATE LISTENER (AUTO-REFRESH LOCATION ON RESUME) ---
    let appListener: any;
    const setupAppListener = async () => {
        try {
            appListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    console.log('App resumed, re-checking location...');
                    // Chỉ gọi lại nếu chưa có location hoặc đang bị lỗi
                    getUserLocation();
                }
            });
        } catch (err) {
            console.warn('App State Listener failed:', err);
        }
    };
    setupAppListener();

    setJobsLoading(true);
    const unsubscribeJobs = subscribeToJobs((jobs) => {
      setAllJobs(jobs);
      setJobsLoading(false);
    });
    
    return () => {
        unsubscribeJobs();
        if (appListener) {
            appListener.remove();
        }
    };
  }, [getUserLocation, currentUser]);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [locationFilter, typeFilter]);

  const handleHardReset = async () => {
    if (window.confirm("Thao tác này sẽ xóa bộ nhớ đệm và tải lại trang để khắc phục lỗi. Bạn có muốn tiếp tục?")) {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        } catch (e) {
            console.error(e);
            window.location.reload();
        }
    }
  };

  const handleSelectJobForDetail = (job: Job) => {
    setSelectedJob(job);
  };

  const handleViewJobOnMap = (jobToView: Job) => {
    if (!jobToView) return;
    setSelectedJob(null);
    setActiveView(View.Jobs);
    setJobViewMode('map');
    setFocusedJobId(jobToView.id);
  };

  const handleNavigateToConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setActiveView(View.Messaging);
  };

  const handleStartConversationWithUser = async (application: Application) => {
      if (!application) return;
      try {
        const conversationId = await getOrCreateConversation(application);
        if (viewingProfile) setViewingProfile(null);
        handleNavigateToConversation(conversationId);
      } catch (error) {
          console.error("Failed to start conversation:", error);
          alert(t('common.error'));
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
    } else if (link === '/insurance') {
        setActiveView(View.Insurance);
    }
  };

  const handlePageChange = (page: number) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (userLocation) {
        jobs.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    
    return {
      uniqueLocations: locations as string[],
      uniqueTypes: types as string[],
      filteredJobs: jobs
    };
  }, [allJobs, locationFilter, typeFilter, userLocation]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const currentJobs = filteredJobs.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

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
                                <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">{t('app.search_jobs')}</h2>
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

                            {locationError && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-sm">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MapIcon className="w-5 h-5 text-red-600" />
                                            <p className="font-bold">{t('map.location_permission_required')}</p>
                                        </div>
                                        <p className="text-sm opacity-90 whitespace-pre-line">{locationError}</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                                        <button
                                            onClick={handleHardReset}
                                            className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-3 rounded-lg transition-colors text-sm whitespace-nowrap"
                                        >
                                            {t('map.fix_connection')}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                getUserLocation();
                                            }}
                                            disabled={isLocating}
                                            className="bg-white border border-red-200 hover:bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center shrink-0 disabled:opacity-50 shadow-sm whitespace-nowrap"
                                        >
                                            {isLocating ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    {t('map.retry_loading')}
                                                </>
                                            ) : (
                                                t('map.retry')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {jobViewMode === 'list' && (
                            <div className="space-y-4 pb-20">
                                <h3 className="text-xl font-bold text-gray-800 pt-2 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                    {t('app.available_jobs')}
                                    <span className="text-sm font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">{filteredJobs.length}</span>
                                </h3>
                                {jobsLoading ? <Spinner message={t('common.loading')}/> : filteredJobs.length > 0 ? (
                                    <>
                                        {currentJobs.map((job) => (
                                            <JobCard 
                                                key={job.id} 
                                                job={job} 
                                                onClick={() => handleSelectJobForDetail(job)} 
                                                applicantCount={job.applicantCount || 0}
                                            />
                                        ))}
                                        
                                        {/* Pagination Controls - FLOATING FIXED BOTTOM VIA PORTAL */}
                                        {totalPages > 1 && createPortal(
                                            <div className="fixed bottom-[88px] md:bottom-10 left-0 right-0 flex justify-center pointer-events-none z-40">
                                                <div className="bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/50 rounded-full p-1.5 flex items-center space-x-1 pointer-events-auto transform transition-all animate-fade-in-up">
                                                    <button
                                                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                                        disabled={currentPage === 1}
                                                        className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                        title={t('common.prev_page')}
                                                    >
                                                        <ArrowLeftIcon className="w-5 h-5" />
                                                    </button>
                                                    
                                                    <div className="flex space-x-1 px-1 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
                                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                            <button
                                                                key={page}
                                                                onClick={() => handlePageChange(page)}
                                                                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                                                                    currentPage === page
                                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                                        : 'bg-transparent text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                        title={t('common.next_page')}
                                                    >
                                                        <ArrowRightIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 px-4 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600">{t('filters.no_jobs')}</p>
                                    </div>
                                )}
                            </div>
                            )}

                            {jobViewMode === 'map' && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 pt-2 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                                        {t('app.job_locations')}
                                    </h3>
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
    return <Spinner fullScreen message={t('common.loading')} />;
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
