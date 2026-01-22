
import React from 'react';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import SparklesIcon from './icons/SparklesIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import RocketLaunchIcon from './icons/RocketLaunchIcon';
import HeartIcon from './icons/HeartIcon';
import MailIcon from './icons/MailIcon';
import LanguageSwitcher from './LanguageSwitcher'; 
import { useTranslation, Trans } from 'react-i18next'; 

const LandingPage: React.FC<{ onNavigateToAuth: () => void }> = ({ onNavigateToAuth }) => {
    const { t } = useTranslation();
    
    const navItems = [
        { name: t('landing.features_title'), href: '#features' },
        { name: t('landing.how_it_works'), href: '#how-it-works' },
        { name: t('landing.why_us'), href: '#why-us' },
    ];

    const features = [
        {
            icon: <BriefcaseIcon className="w-8 h-8 text-indigo-600" />,
            title: t('landing.step_2_title'),
            description: t('landing.step_2_desc'),
        },
        {
            icon: <ShieldCheckIcon className="w-8 h-8 text-green-600" />,
            title: t('landing.step_3_title'),
            description: t('landing.step_3_desc'),
        },
        {
            icon: <SparklesIcon className="w-8 h-8 text-amber-600" />,
            title: t('landing.step_1_title'),
            description: t('landing.step_1_desc'),
        },
    ];

    const whyUsPoints = [
      {
        icon: <CheckBadgeIcon className="w-8 h-8 text-blue-600" />,
        title: t('landing.why_us_1_title'), 
        description: t('landing.why_us_1_desc')
      },
      {
        icon: <RocketLaunchIcon className="w-8 h-8 text-green-600" />,
        title: t('landing.why_us_2_title'),
        description: t('landing.why_us_2_desc')
      },
      {
        icon: <HeartIcon className="w-8 h-8 text-red-600" />,
        title: t('landing.why_us_3_title'),
        description: t('landing.why_us_3_desc')
      }
    ];

    const testimonials = [
        {
            quote: "Nhờ An Tâm Việc Làm, tôi đã tìm được công việc phụ hồ gần nhà với thu nhập ổn định.",
            name: "Anh Minh Tuấn",
            role: "Lao động xây dựng",
            avatar: "https://images.unsplash.com/photo-1581092921462-2150b3e19190?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        },
        {
            quote: "Nền tảng giúp tôi nhanh chóng tìm được người giúp việc theo giờ mỗi khi quán đông khách.",
            name: "Chị Lan Anh",
            role: "Chủ quán ăn",
            avatar: "https://images.unsplash.com/photo-1600565193348-f74d3c2723a9?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        }
    ];

    return (
        <div className="bg-white text-gray-800 antialiased animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center space-x-10">
                            <a href="#" className="flex items-center flex-shrink-0 group">
                                <img 
                                    src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" 
                                    alt="An Tâm Việc Làm Logo" 
                                    className="h-10 w-10 rounded-full object-cover" 
                                />
                                <h1 className="ml-3 text-2xl font-bold">{t('app_name')}</h1>
                            </a>
                            <nav className="hidden md:flex items-baseline space-x-6">
                                {navItems.map(item => (
                                    <a key={item.name} href={item.href} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                                        {item.name}
                                    </a>
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            <LanguageSwitcher />
                            <button 
                                onClick={onNavigateToAuth}
                                className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {t('common.login')}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center pt-24 pb-32">
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                <Trans i18nKey="landing.hero_title">
                                    Nền tảng <span className="text-indigo-600">An Sinh</span> và <span className="text-indigo-600">Việc Làm</span> cho Lao Động Tự Do
                                </Trans>
                            </h1>
                            <p className="mt-6 text-lg text-gray-600">
                                {t('landing.hero_desc')}
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                                <button 
                                    onClick={onNavigateToAuth}
                                    className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-700 transition-transform hover:scale-105 shadow-lg"
                                >
                                    {t('landing.cta_join')}
                                </button>
                                <a 
                                    href="#features"
                                    className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-50 transition-colors border-2 border-indigo-200"
                                >
                                    {t('landing.cta_learn_more')}
                                </a>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Freelance working smiling" className="rounded-2xl shadow-2xl object-cover w-full h-full"/>
                        </div>
                    </div>
                </section>

                {/* How it works Section */}
                 <section id="how-it-works" className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                             <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('landing.how_it_works')}</h2>
                             <p className="mt-4 text-lg text-gray-600">{t('landing.step_1_desc')}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full text-2xl font-bold mb-4 border-4 border-white shadow-md">1</div>
                                <h3 className="text-xl font-bold mb-2">{t('landing.step_1_title')}</h3>
                                <p className="text-gray-600">{t('landing.step_1_desc')}</p>
                            </div>
                             <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full text-2xl font-bold mb-4 border-4 border-white shadow-md">2</div>
                                <h3 className="text-xl font-bold mb-2">{t('landing.step_2_title')}</h3>
                                <p className="text-gray-600">{t('landing.step_2_desc')}</p>
                            </div>
                             <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full text-2xl font-bold mb-4 border-4 border-white shadow-md">3</div>
                                <h3 className="text-xl font-bold mb-2">{t('landing.step_3_title')}</h3>
                                <p className="text-gray-600">{t('landing.step_3_desc')}</p>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Features Section */}
                <section id="features" className="py-20 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                             <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('landing.features_title')}</h2>
                             <p className="mt-4 text-lg text-gray-600">{t('landing.step_2_desc')}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <div key={index} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
                                      {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                    <p className="text-gray-600">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Us Section */}
                <section id="why-us" className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                         <div className="text-center mb-16">
                             <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('landing.why_us')}</h2>
                             <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600">
                                {t('landing.step_3_desc')}
                             </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {whyUsPoints.map((point, index) => (
                                 <div key={index} className="bg-white p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
                                      {point.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{point.title}</h3>
                                    <p className="text-gray-600">{point.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                 {/* Testimonials Section */}
                <section id="testimonials" className="py-20 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('landing.testimonials_title')}</h2>
                            <p className="mt-4 text-lg text-gray-600">{t('landing.testimonials_desc')}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <div key={index} className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
                                    <p className="text-gray-600 italic mb-6">"{testimonial.quote}"</p>
                                    <div className="flex items-center">
                                        <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                        <div>
                                            <p className="font-bold text-gray-900">{testimonial.name}</p>
                                            <p className="text-gray-500 text-sm">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>


                {/* CTA Section */}
                <section>
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
                         <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('landing.cta_footer_title')}</h2>
                         <p className="mt-4 text-lg text-gray-600">
                           {t('landing.cta_footer_desc')}
                         </p>
                         <div className="mt-8">
                            <button 
                                onClick={onNavigateToAuth}
                                className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-indigo-700 transition-transform hover:scale-105 shadow-lg"
                            >
                                {t('common.register')}
                            </button>
                         </div>
                    </div>
                </section>
            </main>
            
            {/* Footer */}
            <footer className="bg-gray-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                   <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                             <a href="#" className="flex items-center justify-center md:justify-start flex-shrink-0 group">
                                <img 
                                    src="https://ik.imagekit.io/duyphuc/AN%20T%C3%82M%20VI%E1%BB%86CL%C3%80M.jpg" 
                                    alt="An Tâm Việc Làm Logo" 
                                    className="h-10 w-10 rounded-full object-cover" 
                                />
                                <h1 className="ml-3 text-2xl font-bold">{t('app_name')}</h1>
                            </a>
                            <p className="text-gray-400 mt-2 text-center md:text-left">{t('landing.hero_desc').substring(0, 50)}...</p>
                        </div>
                         <div className="md:col-span-1">
                             <h3 className="font-semibold text-white mb-4 text-center md:text-left">{t('common.search')}</h3>
                             <nav className="flex flex-col items-center md:items-start space-y-2">
                               {navItems.map(item => (
                                    <a key={item.name} href={item.href} className="text-gray-300 hover:text-white font-medium transition-colors">
                                        {item.name}
                                    </a>
                                ))}
                            </nav>
                         </div>
                         <div className="md:col-span-1">
                            <h3 className="font-semibold text-white mb-4 text-center md:text-left">{t('common.contact')}</h3>
                            <div className="flex items-center justify-center md:justify-start text-gray-300">
                                <MailIcon className="w-5 h-5 mr-2"/>
                                <a href="mailto:nguyenduyphuc0119@gmail.com" className="hover:text-white transition-colors">nguyenduyphuc0119@gmail.com</a>
                            </div>
                         </div>
                   </div>
                    <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
                         <p>&copy; 2024 {t('app_name')}. {t('landing.footer_rights')}</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
