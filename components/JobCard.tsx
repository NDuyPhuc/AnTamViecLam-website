
import React from 'react';
import type { Job } from '../types';
import { formatTimeAgo } from '../utils/formatters';
import BriefcaseIcon from './icons/BriefcaseIcon';
import UsersIcon from './icons/UsersIcon';
import MapPinIcon from './icons/MapPinIcon';
import ClockIcon from './icons/ClockIcon';
import FlagIcon from './icons/FlagIcon';
import { useTranslation } from 'react-i18next';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  applicantCount: number;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick, applicantCount }) => {
  const { t } = useTranslation();
  const isClosed = job.status === 'CLOSED';

  // Helper to translate pay rate
  const getPayString = () => {
      if (job.payRate === "Thỏa thuận") return t('job.salary_negotiable');
      const unit = job.payType === 'THEO GIỜ' ? t('job.pay_hour') 
                 : job.payType === 'THEO NGÀY' ? t('job.pay_day')
                 : job.payType === 'THEO THÁNG' ? t('job.pay_month') : '';
      return `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(job.payRate as number)}${unit}`;
  };

  // Helper to translate job type
  const getJobTypeLabel = (type: string | undefined) => {
      if (!type) return '';
      switch (type) {
          case 'Thời vụ': return t('job.type_seasonal');
          case 'Bán thời gian': return t('job.type_parttime');
          case 'Linh hoạt': return t('job.type_flexible');
          case 'Toàn thời gian': return t('job.type_fulltime');
          default: return type;
      }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    
    const recipient = "nguyenduyphuc0119@gmail.com";
    const subject = encodeURIComponent(`Báo cáo tin tuyển dụng: ${job.title}`);
    const body = encodeURIComponent(
      `Kính gửi Ban quản trị An Tâm Việc Làm,\n\n` +
      `Tôi muốn báo cáo tin tuyển dụng sau vì nội dung không chính xác hoặc không phù hợp:\n\n` +
      `- ID Công việc: ${job.id}\n` +
      `- Tiêu đề: ${job.title}\n` +
      `- Nhà tuyển dụng: ${job.employerName}\n\n` +
      `Lý do báo cáo:\n(Vui lòng nhập lý do của bạn tại đây)\n\n` +
      `Trân trọng.`
    );

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

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
      aria-label={`${t('job.detail_modal_title')}: ${job.title}`}
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
            <div className="flex items-center text-xs text-gray-500 flex-shrink-0 ml-4 pt-1" title={`${t('job.posted_at')} ${new Date(job.createdAt).toLocaleString()}`}>
                <ClockIcon className="w-4 h-4 mr-1"/>
                <span>{formatTimeAgo(job.createdAt)}</span>
            </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{job.addressString}</p>
        
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100 sm:mt-auto flex-wrap gap-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">{getPayString()}</span>
            
            {job.distance !== undefined && (
              <div className="flex items-center text-xs text-gray-600 font-medium" title="">
                  <MapPinIcon className="w-4 h-4 mr-1 text-gray-500" />
                  <span>{job.distance.toFixed(1)} {t('job.distance')}</span>
              </div>
            )}
             {applicantCount > 0 && (
              <div className="flex items-center text-xs text-gray-600 font-medium" title={`${applicantCount} ${t('job.applicants')}`}>
                <UsersIcon className="w-4 h-4 mr-1 text-gray-500" />
                <span>{applicantCount}</span>
              </div>
            )}
            {job.jobType && <span className="text-xs text-indigo-700 font-medium bg-indigo-100 px-3 py-1 rounded-full">{getJobTypeLabel(job.jobType)}</span>}
            {isClosed ? (
              <span className="text-xs font-medium text-gray-700 bg-gray-200 px-3 py-1 rounded-full">{t('job.status_closed')}</span>
            ) : (
              <span className="text-xs font-medium text-green-700 bg-green-100 px-3 py-1 rounded-full">{t('job.status_open')}</span>
            )}
          </div>

          <button 
            onClick={handleReport}
            className="flex items-center text-xs font-medium text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
            title={t('job.report')}
            aria-label={t('job.report')}
          >
            <FlagIcon className="w-4 h-4 mr-1" />
            {t('job.report')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
