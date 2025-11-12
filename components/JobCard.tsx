import React from 'react';
import type { Job } from '../types';
import { formatPay, formatTimeAgo } from '../utils/formatters';
import BriefcaseIcon from './icons/BriefcaseIcon';
import UsersIcon from './icons/UsersIcon';
import MapPinIcon from './icons/MapPinIcon';
import ClockIcon from './icons/ClockIcon';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  applicantCount: number;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick, applicantCount }) => {
  const isClosed = job.status === 'CLOSED';

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className={`bg-white p-5 rounded-xl border border-gray-200 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-5 transition-all duration-300 ${isClosed ? 'opacity-60' : 'hover:shadow-lg hover:border-indigo-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-1'}`}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết công việc ${job.title} tại ${job.employerName}`}
    >
      {job.employerProfileUrl ? (
        <img src={job.employerProfileUrl} alt={`${job.employerName} logo`} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <BriefcaseIcon className="w-10 h-10 text-gray-400" />
        </div>
      )}
      
      <div className="flex-grow flex flex-col">
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.employerName}</p>
            </div>
            <div className="flex items-center text-xs text-gray-500 flex-shrink-0 ml-4 pt-1" title={`Đăng vào ${new Date(job.createdAt).toLocaleString('vi-VN')}`}>
                <ClockIcon className="w-4 h-4 mr-1"/>
                <span>{formatTimeAgo(job.createdAt)}</span>
            </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{job.addressString}</p>
        
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100 sm:mt-auto">
          <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">{formatPay(job.payRate, job.payType)}</span>
          <div className="flex items-center space-x-3">
            {job.distance !== undefined && (
              <div className="flex items-center text-xs text-gray-600 font-medium" title={`Khoảng cách ước tính ${job.distance.toFixed(1)} km`}>
                  <MapPinIcon className="w-4 h-4 mr-1 text-gray-500" />
                  <span>{job.distance.toFixed(1)} km</span>
              </div>
            )}
             {applicantCount > 0 && (
              <div className="flex items-center text-xs text-gray-600 font-medium" title={`${applicantCount} người đã ứng tuyển`}>
                <UsersIcon className="w-4 h-4 mr-1 text-gray-500" />
                <span>{applicantCount}</span>
              </div>
            )}
            {job.jobType && <span className="text-xs text-indigo-700 font-medium bg-indigo-100 px-3 py-1 rounded-full">{job.jobType}</span>}
            {isClosed ? (
              <span className="text-xs font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full">Đã đóng</span>
            ) : (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">Đang tuyển</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;