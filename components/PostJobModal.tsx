
import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addJob } from '../services/jobService';
import LocationPickerMap from './LocationPickerMap';
import { Province, District, Ward } from '../data/vietnam-locations';

interface PostJobModalProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const PostJobModal: React.FC<PostJobModalProps> = ({ onClose, userLocation }) => {
  const { currentUserData } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // State for new location fields from API
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
             // Map API response (id: string) to local interface (code: number)
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
            }));
            setProvinces(mappedData);
        } catch (e) {
            console.error("Failed to fetch provinces:", e);
            setError("Không thể tải danh sách Tỉnh/Thành. Vui lòng thử lại.");
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
            // Map API response (id: string, provinceId: string) to local interface (code: number, province_code: number)
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
                province_code: parseInt(item.provinceId, 10)
            }));
            setDistricts(mappedData);
        } catch (e) {
            console.error("Failed to fetch districts:", e);
            setError("Không thể tải danh sách Quận/Huyện.");
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
            // Map API response (id: string, districtId: string) to local interface (code: number, district_code: number)
            const mappedData = (data.data || []).map((item: any) => ({
                name: item.name,
                code: parseInt(item.id, 10),
                district_code: parseInt(item.districtId, 10)
            }));
            setWards(mappedData);
        } catch (e) {
            console.error("Failed to fetch wards:", e);
            setError("Không thể tải danh sách Phường/Xã.");
        } finally {
            setWardsLoading(false);
        }
    };
    
    fetchWards();
  }, [selectedDistrict]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvince(e.target.value);
    // Reset subsequent selections
    setSelectedDistrict('');
    setSelectedWard('');
    setDistricts([]);
    setWards([]);
  };
  
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDistrict(e.target.value);
    // Reset subsequent selections
    setSelectedWard('');
    setWards([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserData) {
      setError('Bạn phải đăng nhập để đăng tin.');
      return;
    }
    
    if (!coordinates) {
        setError('Vui lòng chọn một vị trí trên bản đồ.');
        return;
    }
    if (!selectedProvince || !selectedDistrict || !selectedWard) {
        setError('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, và Phường/Xã.');
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
        };
        await addJob(newJobData, currentUserData);
        onClose();
    } catch (err: any) {
        setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4 overflow-y-auto"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden relative animate-fade-in-up mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800">Đăng tin tuyển dụng mới</h2>
                <p className="text-sm text-gray-500 mt-1">Cung cấp thông tin chi tiết về công việc bạn muốn đăng.</p>
                
                <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Form fields */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Tiêu đề công việc</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-y"></textarea>
                    </div>

                    {/* New Address Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="province" className="block text-sm font-medium text-gray-700">Tỉnh/Thành phố</label>
                           <select id="province" value={selectedProvince} onChange={handleProvinceChange} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                {provincesLoading ? <option>Đang tải...</option> : <option value="">-- Chọn Tỉnh/Thành --</option>}
                                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                           </select>
                        </div>
                         <div>
                           <label htmlFor="district" className="block text-sm font-medium text-gray-700">Quận/Huyện</label>
                           <select id="district" value={selectedDistrict} onChange={handleDistrictChange} required disabled={!selectedProvince || districtsLoading} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                               {districtsLoading ? <option>Đang tải...</option> : <option value="">-- Chọn Quận/Huyện --</option>}
                               {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                           </select>
                        </div>
                    </div>
                     <div>
                       <label htmlFor="ward" className="block text-sm font-medium text-gray-700">Phường/Xã</label>
                       <select id="ward" value={selectedWard} onChange={e => setSelectedWard(e.target.value)} required disabled={!selectedDistrict || wardsLoading} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                           {wardsLoading ? <option>Đang tải...</option> : <option value="">-- Chọn Phường/Xã --</option>}
                           {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
                       </select>
                    </div>
                    <div>
                        <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">Số nhà, tên đường</label>
                        <input type="text" id="streetAddress" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="VD: 123 Đường Nguyễn Huệ"/>
                    </div>


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ghim vị trí chính xác trên bản đồ</label>
                      <p className="text-xs text-gray-500 mb-2">Kéo bản đồ để ghim ở vị trí chính xác nhất của công việc.</p>
                       <LocationPickerMap 
                          onLocationChange={setCoordinates}
                          initialCenter={userLocation || { lat: 16.0544, lng: 108.2022 }}
                          initialZoom={userLocation ? 15 : 6}
                       />
                       {coordinates && (
                         <p className="text-xs text-gray-600 mt-1">Tọa độ đã chọn: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
                       )}
                    </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">Loại hình công việc</label>
                            <select id="jobType" value={jobType} onChange={e => setJobType(e.target.value as Job['jobType'])} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option>Thời vụ</option>
                                <option>Bán thời gian</option>
                                <option>Linh hoạt</option>
                                <option>Toàn thời gian</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="payType" className="block text-sm font-medium text-gray-700">Hình thức trả lương</label>
                            <select id="payType" value={payType} onChange={e => setPayType(e.target.value as Job['payType'])} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="THEO NGÀY">Theo ngày</option>
                                <option value="THEO GIỜ">Theo giờ</option>
                                <option value="THEO THÁNG">Theo tháng</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="payRate" className="block text-sm font-medium text-gray-700">Mức lương (VNĐ)</label>
                        <input type="number" id="payRate" value={payRate} onChange={e => setPayRate(e.target.value)} required={!isNegotiable} disabled={isNegotiable} className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100" />
                        <div className="mt-2 flex items-center">
                            <input type="checkbox" id="negotiable" checked={isNegotiable} onChange={e => setIsNegotiable(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <label htmlFor="negotiable" className="ml-2 block text-sm text-gray-900">Thỏa thuận</label>
                        </div>
                    </div>
                </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 mx-6 rounded-lg border border-red-200">{error}</p>}

            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center disabled:bg-indigo-400"
                >
                    {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    {isLoading ? 'Đang đăng tin...' : 'Đăng tin'}
                </button>
                <button 
                    type="button"
                    onClick={onClose}
                    className="w-full bg-white text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 border border-gray-300 transition-colors duration-300"
                    aria-label="Hủy"
                >
                    Hủy
                </button>
            </div>
        </form>
      </div>
       <style>{`
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
    `}</style>
    </div>
  );
};

export default PostJobModal;
