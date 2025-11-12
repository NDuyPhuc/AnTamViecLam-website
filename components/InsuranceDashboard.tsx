import React, { useState } from 'react';
import { MOCK_INSURANCE_DATA } from '../constants';
import PaymentModal from './PaymentModal';
import SparklesIcon from './icons/SparklesIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';

// Import new icons
import CarIcon from './icons/CarIcon';
import MotorcycleIcon from './icons/MotorcycleIcon';
import HeartIcon from './icons/HeartIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import BuildingStorefrontIcon from './icons/BuildingStorefrontIcon';
import HomeIcon from './icons/HomeIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';


// Local icon definition to avoid creating a new file
const ArrowPathIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.18-3.182a8.25 8.25 0 00-11.664 0l-3.182 3.182" />
  </svg>
);

const additionalInsuranceProducts = [
  { 
    title: 'BH xe máy bắt buộc', 
    description: 'Bảo vệ trách nhiệm dân sự của bạn khi tham gia giao thông.', 
    link: 'https://motor-civil.globalcare.vn/293f4359&skip-password=1?token=2306244fxozgmotc', 
    icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH ô tô bắt buộc', 
    description: 'Yên tâm vững lái với bảo hiểm trách nhiệm dân sự cho ô tô.', 
    link: 'https://oto-civil.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH vật chất ô tô', 
    description: 'Bảo vệ toàn diện cho xế yêu trước mọi rủi ro va chạm, hư hỏng.', 
    link: 'https://phydam.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <CarIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH sức khỏe', 
    description: 'Chăm sóc sức khỏe toàn diện cho bạn và gia đình.', 
    link: 'https://globalcare.vn/products-hub?code=health&token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH an ninh mạng', 
    description: 'Bảo vệ bạn khỏi các rủi ro và tấn công trên không gian mạng.', 
    link: 'https://globalcare.vn/bao-hiem-an-ninh-mang?token=2306244fxozgmotc', 
    icon: <ShieldExclamationIcon className="w-7 h-7 text-blue-600" /> 
  },
  { 
    title: 'BH toàn diện hộ kinh doanh', 
    description: 'An tâm kinh doanh với giải pháp bảo vệ tài sản và hoạt động.', 
    link: 'https://globalcare.vn/bao-hiem-toan-dien-ho-kinh-doanh-ca-the?token=2306244fxozgmotc', 
    icon: <BuildingStorefrontIcon className="w-7 h-7 text-yellow-600" /> 
  },
  { 
    title: 'BH cứu hộ xe máy 24/7', 
    description: 'Hỗ trợ kịp thời mọi lúc, mọi nơi khi xe bạn gặp sự cố.', 
    link: 'https://globalcare.vn/dich-vu-cuu-ho-xe-may?token=2306244fxozgmotc', 
    icon: <MotorcycleIcon className="w-7 h-7 text-gray-700" /> 
  },
  { 
    title: 'BH bệnh hiểm nghèo', 
    description: 'Nguồn tài chính vững chắc giúp bạn vượt qua bệnh tật.', 
    link: 'https://critical-disease.globalcare.vn/b45306c2?token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH VIB care', 
    description: 'Gói chăm sóc sức khỏe cao cấp với nhiều quyền lợi vượt trội.', 
    link: 'https://vbi-care.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <HeartIcon className="w-7 h-7 text-red-500" /> 
  },
  { 
    title: 'BH nhà tư nhân', 
    description: 'Bảo vệ tổ ấm của bạn trước những rủi ro cháy, nổ, thiên tai.', 
    link: 'https://private-home.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
  },
  { 
    title: 'BH tai nạn Tomato', 
    description: 'Gói bảo hiểm tai nạn cá nhân linh hoạt, chi phí thấp.', 
    link: 'https://tomato.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
    icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
  },
  { 
    title: 'BH Home Care', 
    description: 'Bảo vệ toàn diện cho ngôi nhà và tài sản bên trong.', 
    link: 'https://private-home.globalcare.vn/3bb76e94?token=2306244fxozgmotc', 
    icon: <HomeIcon className="w-7 h-7 text-green-600" /> 
  },
  { 
    title: 'BH tai nạn cá nhân', 
    description: 'An tâm trước mọi rủi ro không lường trước trong cuộc sống.', 
    link: 'https://personal-accident.globalcare.vn/293f4359?token=2306244fxozgmotc', 
    icon: <ShieldCheckIcon className="w-7 h-7 text-indigo-600" /> 
  }
];


const InsuranceDashboard: React.FC = () => {
  const data = MOCK_INSURANCE_DATA;
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [autoDeduct, setAutoDeduct] = useState(data.autoDeductEnabled);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <>
      <div className="space-y-12">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Trung tâm An Sinh</h2>
          <p className="text-lg text-gray-600">Tích lũy cho tương lai, an tâm cho hôm nay.</p>
        </div>

        {/* BHXH Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-800">Bảo hiểm Xã hội Tự nguyện</h3>
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Points System Card - COMING SOON */}
            <div className="relative bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col opacity-70">
              <div className="absolute top-3 right-3 bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full z-10">
                  Dự kiến ra mắt
              </div>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <SparklesIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Tích Điểm An Sinh</h3>
                  <p className="text-sm text-gray-500">Hoàn thành việc, nhận thưởng từ nền tảng.</p>
                </div>
              </div>
              <div className="flex-grow space-y-3 mt-auto">
                <p className="text-3xl font-bold text-gray-400">0 <span className="text-xl font-semibold text-gray-500">/ {data.pointsGoal} điểm</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                          className="bg-gray-300 h-2.5 rounded-full"
                          style={{ width: `0%` }}
                      ></div>
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mt-3 flex items-start space-x-2">
                  <InformationCircleIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5"/>
                  <p>
                    <span className="font-semibold">[Tính năng dự kiến]</span> Với mỗi công việc hoàn thành, bạn sẽ được cộng điểm. Khoản hỗ trợ <span className="font-semibold text-gray-500">{formatCurrency(data.pointsRewardVND)}</span> sẽ được tài trợ bởi <span className="font-semibold">Quỹ An Sinh</span> khi bạn đạt mốc điểm.
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-Deduct Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <ArrowPathIcon className="w-6 h-6 text-indigo-600" /> 
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Tích Lũy Tự Động</h3>
                      <p className="text-sm text-gray-500">Để dành cho tương lai.</p>
                    </div>
                </div>
                {/* Toggle switch */}
                <button 
                  onClick={() => setAutoDeduct(!autoDeduct)} 
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${autoDeduct ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${autoDeduct ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex-grow flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4 text-center mt-auto">
                {autoDeduct ? (
                  <>
                    <p className="text-sm text-gray-600">Số tiền đã tích lũy trong tháng này</p>
                    <p className="text-4xl font-extrabold text-indigo-600 my-2">{formatCurrency(data.autoDeductAccumulatedThisMonth)}</p>
                    <p className="text-xs text-gray-500">Hệ thống sẽ tự động trích 2% thu nhập từ các công việc bạn làm qua nền tảng. Khoản tích lũy này sẽ được đặt lại vào đầu mỗi tháng.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700">Tính năng đang tắt</p>
                    <p className="text-xs text-gray-500 mt-1">Bật để tự động trích một phần thu nhập cho quỹ BHXH của bạn.</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chủ động đóng góp</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn có thể đóng thêm vào quỹ BHXH của mình bất cứ lúc nào để nhanh chóng đạt được mục tiêu hưu trí.
            </p>
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 shadow-sm"
            >
              Đóng BHXH ngay
            </button>
          </div>
        </div>
        
        {/* Additional Insurance Section */}
        <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-800">Sản phẩm Bảo hiểm Bổ sung</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalInsuranceProducts.map((product) => (
                  <a 
                    key={product.title}
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                       <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          {product.icon}
                       </div>
                       <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="font-bold text-gray-800 mt-4">{product.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                  </a>
                ))}
            </div>
        </div>
      </div>
      {isPaymentModalOpen && <PaymentModal onClose={() => setIsPaymentModalOpen(false)} />}
    </>
  );
};

export default InsuranceDashboard;