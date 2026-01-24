
import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addJob } from '../services/jobService';
import LocationPickerMap from './LocationPickerMap';
import { Province, District, Ward } from '../data/vietnam-locations';
import { useTranslation } from 'react-i18next';
import CalendarIcon from './icons/CalendarIcon';
import FireIcon from './icons/FireIcon';
import XIcon from './icons/XIcon';

interface PostJobModalProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const PostJobModal: React.FC<PostJobModalProps> = ({ onClose, userLocation }) => {
  const { t } = useTranslation();
  const { currentUserData } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [provincesLoading, setProvincesLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [streetAddress, setStreetAddress] = useState('');

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const [payRate, setPayRate] = useState('');
  const [payType, setPayType] = useState<Job['payType']>('THEO NGÀY');
  const [jobType, setJobType] = useState<Job['jobType']>('Thời vụ');
  const [isNegotiable, setIsNegotiable] = useState(false);

  // NEW FIELDS
  const [deadline, setDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch provinces on component mount
  useEffect(() => {
    const fetchProvinces = async () => {
        setProvincesLoading(true);
        setError('');
        try {
            const response = await fetch('https://open.oapi.vn/location/provinces?size=100');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
            }));
            setProvinces(mappedData);
        } catch (e) {
            console.error("Failed to fetch provinces:", e);
            setError(t('common.error'));
        } finally {
            setProvincesLoading(false);
        }
    };
    fetchProvinces();
  }, []);

  // Fetch districts when a province is selected
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setWards([]);
      setSelectedDistrict('');
      setSelectedWard('');
      return;
    }

    const fetchDistricts = async () => {
        setDistrictsLoading(true);
        setError('');
        try {
            const response = await fetch(`https://open.oapi.vn/location/districts/${selectedProvince}?size=100`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
                province_code: parseInt(item.provinceId, 10)
            }));
            setDistricts(mappedData);
        } catch (e) {
            console.error("Failed to fetch districts:", e);
            setError(t('common.error'));
        } finally {
            setDistrictsLoading(false);
        }
    };

    fetchDistricts();
  }, [selectedProvince]);

  // Fetch wards when a district is selected
  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      setSelectedWard('');
      return;
    }

    const fetchWards = async () => {
        setWardsLoading(true);
        setError('');
        try {
            const response = await fetch(`https://open.oapi.vn/location/wards/${selectedDistrict}?size=100`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
                district_code: parseInt(item.districtId, 10)
            }));
            setWards(mappedData);
        } catch (e) {
            console.error("Failed to fetch wards:", e);
            setError(t('common.error'));
        } finally {
            setWardsLoading(false);
        }
    };
    
    fetchWards();
  }, [selectedDistrict]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvince(e.target.value);
    setSelectedDistrict('');
    setSelectedWard('');
    setDistricts([]);
    setWards([]);
  };
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
    setSelectedWard('');
    setWards([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserData) {
      setError(t('common.error'));
      return;
    }
    
    if (!coordinates) {
        setError(t('post_job.error_location_required')); 
        return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
        setError(t('common.error')); // Generic for now or add specific key
        return;
    }

    setIsLoading(true);
    setError('');

    try {
        const provinceName = provinces.find(p => p.code === parseInt(selectedProvince))?.name || '';
        const districtName = districts.find(d => d.code === parseInt(selectedDistrict))?.name || '';
        const wardName = wards.find(w => w.code === parseInt(selectedWard))?.name || '';
        
        const fullAddress = `${streetAddress}, ${wardName}, ${districtName}, ${provinceName}`.trim();

        const newJobData = {
            title,
            description,
            addressString: fullAddress,
            coordinates,
            payRate: (isNegotiable ? "Thỏa thuận" : parseFloat(payRate) || 0) as Job['payRate'],
            payType,
            jobType,
            deadline: deadline || undefined,
            isUrgent
        };
        await addJob(newJobData, currentUserData);
        onClose();
    } catch (err: any) {
        setError(t('common.error'));
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 overflow-y-auto"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-slide-up sm:animate-fade-in-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
                <h2 className="text-xl font-bold text-gray-800">{t('post_job.title')}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{t('post_job.subtitle')}</p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
                <XIcon className="w-6 h-6" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
                
                {/* Job Title & Description */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('post_job.job_title')}</label>
                        <input 
                            type="text" 
                            id="title" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            required 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400" 
                            placeholder="VD: Nhân viên phục vụ quán cafe..."
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('post_job.description')}</label>
                        <textarea 
                            id="description" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            required 
                            rows={4} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-y text-gray-900 placeholder-gray-400"
                            placeholder="Mô tả chi tiết công việc, yêu cầu..."
                        ></textarea>
                    </div>
                </div>

                {/* Location Section */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-4">
                    <h3 className="font-bold text-indigo-800 text-sm uppercase tracking-wide">Địa điểm làm việc</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="province" className="block text-xs font-semibold text-gray-600 mb-1">{t('post_job.province')}</label>
                           <select id="province" value={selectedProvince} onChange={handleProvinceChange} required className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900">
                                {provincesLoading ? <option>{t('common.loading')}</option> : <option value="">-- {t('post_job.select_location')} --</option>}
                                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                           </select>
                        </div>
                         <div>
                           <label htmlFor="district" className="block text-xs font-semibold text-gray-600 mb-1">{t('post_job.district')}</label>
                           <select id="district" value={selectedDistrict} onChange={handleDistrictChange} required disabled={!selectedProvince || districtsLoading} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400 text-gray-900">
                               {districtsLoading ? <option>{t('common.loading')}</option> : <option value="">-- {t('post_job.district')} --</option>}
                               {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                           </select>
                        </div>
                    </div>
                     <div>
                       <label htmlFor="ward" className="block text-xs font-semibold text-gray-600 mb-1">{t('post_job.ward')}</label>
                       <select id="ward" value={selectedWard} onChange={e => setSelectedWard(e.target.value)} required disabled={!selectedDistrict || wardsLoading} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400 text-gray-900">
                           {wardsLoading ? <option>{t('common.loading')}</option> : <option value="">-- {t('post_job.ward')} --</option>}
                           {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                       </select>
                    </div>
                    <div>
                        <label htmlFor="streetAddress" className="block text-xs font-semibold text-gray-600 mb-1">{t('post_job.street')}</label>
                        <input type="text" id="streetAddress" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} required className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-900 placeholder-gray-400" placeholder="VD: 123 Nguyễn Văn Linh..."/>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t('post_job.map_pin_label')}</label>
                       <LocationPickerMap 
                          onLocationChange={setCoordinates}
                          initialCenter={userLocation || { lat: 16.0544, lng: 108.2022 }}
                          initialZoom={userLocation ? 15 : 6}
                       />
                       <p className="text-[10px] text-gray-500 mt-1 italic text-right">{t('post_job.map_pin_desc')}</p>
                    </div>
                </div>

                {/* Job Details: Type, Salary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="jobType" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('post_job.job_type')}</label>
                        <div className="relative">
                            <select id="jobType" value={jobType} onChange={e => setJobType(e.target.value as Job['jobType'])} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-gray-900">
                                <option value="Thời vụ">{t('job.type_seasonal')}</option>
                                <option value="Bán thời gian">{t('job.type_parttime')}</option>
                                <option value="Linh hoạt">{t('job.type_flexible')}</option>
                                <option value="Toàn thời gian">{t('job.type_fulltime')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="payType" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('post_job.pay_type')}</label>
                        <div className="relative">
                            <select id="payType" value={payType} onChange={e => setPayType(e.target.value as Job['payType'])} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-gray-900">
                                <option value="THEO NGÀY">{t('post_job.type_day')}</option>
                                <option value="THEO GIỜ">{t('post_job.type_hour')}</option>
                                <option value="THEO THÁNG">{t('post_job.type_month')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="payRate" className="block text-sm font-semibold text-gray-700 mb-1.5">{t('post_job.salary')}</label>
                    <div className="flex items-center gap-3">
                        <input type="number" id="payRate" value={payRate} onChange={e => setPayRate(e.target.value)} required={!isNegotiable} disabled={isNegotiable} className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 font-medium text-gray-900 placeholder-gray-400" placeholder="0" />
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input type="checkbox" id="negotiable" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <span className="text-sm text-gray-700 font-medium">{t('post_job.negotiable')}</span>
                        </label>
                    </div>
                </div>

                {/* Deadline and Urgency Redesign */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                    {/* Deadline */}
                    <div>
                        <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('post_job.deadline_label')}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <CalendarIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input 
                                type="date" 
                                id="deadline" 
                                value={deadline} 
                                min={today}
                                onChange={e => setDeadline(e.target.value)} 
                                className="pl-10 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none cursor-pointer text-gray-900" 
                            />
                        </div>
                    </div>

                    {/* Urgency Toggle */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {t('post_job.urgency_label')}
                        </label>
                        <label 
                            htmlFor="isUrgent"
                            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm ${
                                isUrgent 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors duration-200 ${isUrgent ? 'bg-red-200' : 'bg-gray-100'}`}>
                                    <FireIcon className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-gray-400'}`} />
                                </div>
                                <div>
                                    <span className={`block text-sm font-bold ${isUrgent ? 'text-red-700' : 'text-gray-700'}`}>
                                        {t('post_job.is_urgent')}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium">Đẩy tin lên đầu & Nổi bật</span>
                                </div>
                            </div>
                            
                            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${isUrgent ? 'bg-red-500' : 'bg-gray-200'}`}>
                                <span 
                                    className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform duration-200 ease-in-out mt-1 ml-1 ${isUrgent ? 'translate-x-5' : 'translate-x-0'}`} 
                                />
                            </div>
                            
                            <input 
                                type="checkbox" 
                                id="isUrgent" 
                                checked={isUrgent} 
                                onChange={e => setIsUrgent(e.target.checked)} 
                                className="hidden" 
                            />
                        </label>
                    </div>
                </div>
            </div>

            {error && <div className="px-6 pb-2"><p className="text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-center">{error}</p></div>}

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-10 flex flex-col sm:flex-row gap-3">
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 flex items-center justify-center disabled:opacity-70 active:scale-[0.98]"
                >
                    {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isLoading ? t('post_job.submitting') : t('post_job.submit')}
                </button>
                <button 
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto bg-white text-gray-700 font-bold py-3.5 px-6 rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors duration-300"
                >
                    {t('common.cancel')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PostJobModal;
