


import React, { useState, useMemo, useEffect } from 'react';
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
import { subscribeToAllApplicationCounts } from './services/applicationService';
import { calculateDistance, parseLocationString } from './utils/formatters';
import PublicProfileModal from './components/PublicProfileModal';
import { getOrCreateConversation } from './services/messagingService';
import AdvancedJobRecommendations from './components/AdvancedJobRecommendations';

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
  const [applicationCounts, setApplicationCounts] = useState<{ [jobId: string]: number }>({});
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);


  // State for filters
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  useEffect(() => {
    // Robust Service Worker registration
    if ('serviceWorker' in navigator) {
      // Use the load event to ensure the page is fully loaded
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

    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Không thể lấy vị trí của bạn. Hãy thử cho phép truy cập vị trí trong trình duyệt để xem các công việc gần bạn.");
      }
    );

    setJobsLoading(true);
    const unsubscribeJobs = subscribeToJobs((jobs) => {
      setAllJobs(jobs);
      setJobsLoading(false);
    });
    
    const unsubscribeCounts = subscribeToAllApplicationCounts(setApplicationCounts);

    // Cleanup subscription on unmount
    return () => {
        unsubscribeJobs();
        unsubscribeCounts();
    };
  }, []); // Run only once when the component mounts.

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

                            {locationError && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 rounded-r-lg" role="alert">
                                    <p className="font-bold">Thông báo</p>
                                    <p>{locationError}</p>
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
                                        applicantCount={applicationCounts[job.id] || 0}
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
                        return <ProfilePage onViewProfile={(userId, application) => setViewingProfile({userId, applicationContext: application})} />;
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
    <div className="min-h-screen bg-gray-50">
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
      {isPostJobModalOpen && <PostJobModal onClose={() => setIsPostJobModalOpen(false)} />}
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