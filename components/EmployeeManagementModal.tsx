
import React, { useState, useEffect, useRef } from 'react';
import { Application, EmploymentLog } from '../types';
import XIcon from './icons/XIcon';
import UserIcon from './icons/UserIcon';
import TrophyIcon from './icons/TrophyIcon';
import ClockIcon from './icons/ClockIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { addEmploymentLog, getEmploymentLogs, updatePerformanceScore, terminateEmployee, updateContractUrl } from '../services/applicationService';
import { uploadFile } from '../services/cloudinaryService';
import Spinner from './Spinner';
import { useTranslation, Trans } from 'react-i18next';

interface EmployeeManagementModalProps {
    employee: Application;
    onClose: () => void;
    onPay: (amount: number) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
            active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
    >
        {label}
    </button>
);

const EmployeeManagementModal: React.FC<EmployeeManagementModalProps> = ({ employee, onClose, onPay }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
    const [logs, setLogs] = useState<EmploymentLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [score, setScore] = useState(employee.performanceScore || 50);

    const [pendingScoreChange, setPendingScoreChange] = useState<{value: number, type: string} | null>(null);
    const [scoreReason, setScoreReason] = useState('');

    const [terminationReason, setTerminationReason] = useState('');
    const [contractUrl, setContractUrl] = useState(employee.contractUrl || '');
    const [isEditingContract, setIsEditingContract] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoadingLogs(true);
            try {
                const fetchedLogs = await getEmploymentLogs(employee.id);
                setLogs(fetchedLogs);
            } catch (error) {
                console.error("Failed to fetch logs", error);
            } finally {
                setIsLoadingLogs(false);
            }
        };
        fetchLogs();
    }, [employee.id]);

    const initiateScoreUpdate = (value: number, type: string) => {
        setPendingScoreChange({ value, type });
        setScoreReason('');
    };

    const confirmScoreUpdate = async () => {
        if (!pendingScoreChange || !scoreReason.trim()) {
            alert(t('employee_mgmt.enter_reason'));
            return;
        }

        setIsSubmitting(true);
        const { value, type } = pendingScoreChange;
        try {
            await updatePerformanceScore(employee.id, value);
            setScore(prev => Math.min(100, Math.max(0, prev + value)));
            
            const logDescription = `${scoreReason}`;
            await addEmploymentLog(employee.id, value > 0 ? 'BONUS' : 'PENALTY', type, logDescription);
            
            const fetchedLogs = await getEmploymentLogs(employee.id);
            setLogs(fetchedLogs);
            
            setPendingScoreChange(null);
            setScoreReason('');
        } catch (e) {
            console.error(e);
            alert(t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleTerminate = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!terminationReason.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await terminateEmployee(employee, terminationReason);
            onClose();
        } catch (err: any) {
            console.error("Termination error:", err);
            alert(`${t('common.error')}: ${err.message || t('employee_mgmt.error_terminate')}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContractFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsSubmitting(true);
            try {
                const url = await uploadFile(file);
                setContractUrl(url);
            } catch (err) {
                console.error(err);
                alert(t('common.error'));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const saveContractUrl = async () => {
        if (!contractUrl.trim()) return;
        setIsSubmitting(true);
        try {
            await updateContractUrl(employee.id, contractUrl);
            await addEmploymentLog(employee.id, 'HIRED', 'Cập nhật hợp đồng', 'Đã cập nhật liên kết hợp đồng lao động.');
            setIsEditingContract(false);
            alert(t('common.success'));
        } catch (err) {
            console.error(err);
            alert(t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isTerminated = employee.status === 'terminated';

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-6 text-white flex justify-between items-start ${isTerminated ? 'bg-gray-800' : 'bg-indigo-600'}`}>
                    <div className="flex items-center gap-4">
                        {employee.workerProfileImageUrl ? (
                            <img src={employee.workerProfileImageUrl} className="w-16 h-16 rounded-full border-2 border-white object-cover" alt="" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                                <UserIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">{employee.workerName}</h2>
                            <p className="text-white/80 text-sm">{employee.jobTitle}</p>
                            <div className="flex items-center gap-2 mt-1">
                                {isTerminated ? (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded border border-red-400 font-bold">
                                        {t('employee_mgmt.terminated')}
                                    </span>
                                ) : (
                                    <span className="bg-green-400/20 text-green-100 text-xs px-2 py-0.5 rounded border border-green-400/30">
                                        {t('employee_mgmt.official')}
                                    </span>
                                )}
                                <span className="text-xs text-white/80 flex items-center">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    {t('insurance.started_at')}: {new Date(employee.applicationDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" type="button">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label={t('employee_mgmt.tab_overview')} />
                    <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label={t('employee_mgmt.tab_history')} />
                    <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label={t('employee_mgmt.tab_settings')} />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-gray-50 flex-grow relative">
                    
                    {/* Score Confirmation Overlay */}
                    {pendingScoreChange && (
                        <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center p-8 animate-fade-in">
                            <div className="w-full max-w-sm text-center">
                                <h4 className="text-xl font-bold text-gray-800 mb-2">
                                    {t('employee_mgmt.confirm_adjustment_title')}
                                </h4>
                                <p className="text-gray-500 mb-4">
                                    <Trans i18nKey="employee_mgmt.confirm_adjustment_desc" values={{ action: pendingScoreChange.value > 0 ? t('employee_mgmt.action_bonus') : t('employee_mgmt.action_penalty'), value: Math.abs(pendingScoreChange.value) }}>
                                        Bạn đang <span className="font-bold text-indigo-600">...</span>
                                    </Trans>
                                </p>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                                    placeholder={t('employee_mgmt.enter_reason')}
                                    rows={3}
                                    value={scoreReason}
                                    onChange={(e) => setScoreReason(e.target.value)}
                                    autoFocus
                                ></textarea>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setPendingScoreChange(null)}
                                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button 
                                        onClick={confirmScoreUpdate}
                                        disabled={isSubmitting || !scoreReason.trim()}
                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-400"
                                    >
                                        {isSubmitting ? t('common.saving') : t('common.confirm')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Score Card */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                        <TrophyIcon className="w-5 h-5 text-yellow-500" />
                                        {t('employee_mgmt.score_title')}
                                    </h3>
                                    <p className="text-sm text-gray-500">{t('employee_mgmt.score_desc')}</p>
                                </div>
                                <div className="text-center">
                                    <span className={`text-3xl font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {score}
                                    </span>
                                    <span className="text-gray-400 text-sm">/100</span>
                                </div>
                            </div>

                            {/* Actions Grid */}
                            <div className={`grid grid-cols-2 gap-4 ${isTerminated ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors">
                                    <h4 className="font-bold text-gray-800 mb-2">{t('employee_mgmt.bonus_point')}</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => initiateScoreUpdate(5, t('employee_mgmt.reason_productivity'))} disabled={isSubmitting} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-100 border border-green-200">+5</button>
                                        <button onClick={() => initiateScoreUpdate(10, t('employee_mgmt.reason_excellence'))} disabled={isSubmitting} className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-100 border border-green-200">+10</button>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-red-300 transition-colors">
                                    <h4 className="font-bold text-gray-800 mb-2">{t('employee_mgmt.penalty_point')}</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => initiateScoreUpdate(-5, t('employee_mgmt.reason_late'))} disabled={isSubmitting} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 border border-red-200">-5</button>
                                        <button onClick={() => initiateScoreUpdate(-10, t('employee_mgmt.reason_violation'))} disabled={isSubmitting} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 border border-red-200">-10</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between ${isTerminated ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div>
                                    <h4 className="font-bold text-indigo-900">{t('employee_mgmt.pay_salary')}</h4>
                                    <p className="text-xs text-indigo-700">{t('employee_mgmt.pay_hint')}</p>
                                </div>
                                <button 
                                    onClick={() => onPay(0)} 
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-all"
                                >
                                    {t('employee_mgmt.pay_now')}
                                </button>
                            </div>
                            
                            {isTerminated && (
                                <p className="text-center text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                    {t('employee_mgmt.terminated_hint')}
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-700 mb-2">{t('employee_mgmt.activity_log')}</h3>
                            {isLoadingLogs ? <Spinner /> : logs.length > 0 ? (
                                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pl-6 py-2">
                                    {logs.map((log) => (
                                        <div key={log.id} className="relative">
                                            <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                                log.type === 'PAYMENT' ? 'bg-green-500' :
                                                log.type === 'BONUS' ? 'bg-yellow-500' :
                                                log.type === 'PENALTY' ? 'bg-red-500' : 
                                                log.type === 'TERMINATION' ? 'bg-gray-800' : 'bg-gray-400'
                                            }`}></div>
                                            <div>
                                                <p className="text-xs text-gray-400">{new Date(log.date).toLocaleString()}</p>
                                                <h4 className="font-bold text-gray-800 text-sm">{log.title}</h4>
                                                <p className="text-sm text-gray-600">{log.description}</p>
                                                {log.amount && (
                                                    <span className="inline-block mt-1 text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">
                                                        {log.amount > 0 ? '+' : ''}{log.amount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 text-sm py-4">{t('employee_mgmt.no_activity')}</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Contract Management */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-800 flex items-center">
                                        <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-600" />
                                        {t('employee_mgmt.contract_title')}
                                    </h4>
                                    {!isEditingContract && contractUrl && !isTerminated && (
                                        <button onClick={() => setIsEditingContract(true)} className="text-xs text-indigo-600 font-semibold hover:underline">
                                            {t('employee_mgmt.edit')}
                                        </button>
                                    )}
                                </div>

                                {(!contractUrl || isEditingContract) && !isTerminated ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-500">{t('employee_mgmt.contract_hint')}</p>
                                        <input 
                                            type="text" 
                                            value={contractUrl}
                                            onChange={(e) => setContractUrl(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isSubmitting}
                                                className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200"
                                            >
                                                {isSubmitting ? t('employee_mgmt.uploading') : t('employee_mgmt.upload_pdf')}
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleContractFileChange} 
                                                className="hidden" 
                                                accept="application/pdf"
                                            />
                                            <button 
                                                onClick={saveContractUrl}
                                                disabled={isSubmitting || !contractUrl}
                                                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:bg-indigo-400"
                                            >
                                                {t('employee_mgmt.save_contract')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                        <span className="text-sm text-gray-600 truncate max-w-[200px]">{contractUrl || t('employee_mgmt.no_contract')}</span>
                                        {contractUrl && (
                                            <a href={contractUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs font-bold hover:underline">
                                                {t('employee_mgmt.view_contract')}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Termination */}
                            {!isTerminated ? (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                    <h4 className="font-bold text-red-800 mb-2">{t('employee_mgmt.danger_zone')}</h4>
                                    <p className="text-sm text-red-600 mb-4">
                                        {t('employee_mgmt.terminate_desc')}
                                    </p>
                                    <div className="space-y-3">
                                        <input 
                                            type="text" 
                                            value={terminationReason}
                                            onChange={(e) => setTerminationReason(e.target.value)}
                                            placeholder={t('employee_mgmt.terminate_reason_placeholder')}
                                            className="w-full p-2 border border-red-300 rounded text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white text-gray-900 placeholder-gray-900"
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleTerminate}
                                            disabled={isSubmitting || !terminationReason.trim()}
                                            className={`w-full font-bold py-2 px-4 rounded-lg transition-colors shadow-sm ${
                                                isSubmitting || !terminationReason.trim()
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-red-600 text-white hover:bg-red-700'
                                            }`}
                                        >
                                            {isSubmitting ? t('common.saving') : t('employee_mgmt.terminate_confirm')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 text-center">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <XIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h4 className="font-bold text-gray-700">{t('employee_mgmt.terminated_state_title')}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{t('employee_mgmt.terminated_state_desc')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeManagementModal;
