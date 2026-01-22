
import React from 'react';
import { useTranslation } from 'react-i18next';

interface JobFiltersProps {
  locations: string[];
  types: string[];
  locationFilter: string;
  typeFilter: string;
  onLocationChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onReset: () => void;
}

const JobFilters: React.FC<JobFiltersProps> = ({
  locations,
  types,
  locationFilter,
  typeFilter,
  onLocationChange,
  onTypeChange,
  onReset,
}) => {
  const { t } = useTranslation();

  // Helper to translate job type for display
  const getJobTypeLabel = (type: string) => {
      switch (type) {
          case 'Thời vụ': return t('job.type_seasonal');
          case 'Bán thời gian': return t('job.type_parttime');
          case 'Linh hoạt': return t('job.type_flexible');
          case 'Toàn thời gian': return t('job.type_fulltime');
          default: return type;
      }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Location Filter */}
        <div>
          <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('filters.location')}
          </label>
          <select
            id="location-filter"
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            className={`w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${!locationFilter ? 'text-gray-500' : 'text-gray-900 font-medium'}`}
          >
            <option value="">{t('filters.location_all')}</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Job Type Filter */}
        <div>
          <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
            {t('filters.type')}
          </label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            className={`w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300 ${!typeFilter ? 'text-gray-500' : 'text-gray-900 font-medium'}`}
          >
            <option value="">{t('filters.type_all')}</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {getJobTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
           <button
            onClick={onReset}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-300 border border-gray-300"
          >
            {t('filters.reset')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobFilters;
