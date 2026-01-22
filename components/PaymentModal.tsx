
import React, { useState, useEffect } from 'react';
import XIcon from './icons/XIcon';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import CubeTransparentIcon from './icons/CubeTransparentIcon';
import UserIcon from './icons/UserIcon';
import { sendPayment, formatAddress, WELFARE_FUND_ADDRESS } from '../services/blockchainService';
import { useTranslation } from 'react-i18next';

interface PaymentModalProps {
  onClose: () => void;
  walletConnected?: boolean;
  onTransactionSuccess?: (hash: string, amount: string) => void;
  recipientAddress?: string; // Optional: If provided, this is a Salary payment
  title?: string; // Optional: Custom title
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
    onClose, 
    walletConnected = false, 
    onTransactionSuccess,
    recipientAddress,
    title
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'traditional' | 'crypto'>('crypto');
  const [amount, setAmount] = useState('');
  const [targetAddress, setTargetAddress] = useState(recipientAddress || WELFARE_FUND_ADDRESS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
      if (recipientAddress) {
          setTargetAddress(recipientAddress);
      }
  }, [recipientAddress]);

  const isSalaryPayment = recipientAddress !== undefined; 
  const displayTitle = title || (isSalaryPayment ? t('payment.title_salary') : t('payment.title_deposit'));
  
  const officialLink = "https://dichvucong.baohiemxahoi.gov.vn/#/index?login=1&url=%2Fthanh-toan-bhxh-dien-tu%2Fngan-hang-lien-ket&queryUrl=";

  const handleCryptoPayment = async () => {
      const sanitizedAmount = amount.replace(',', '.');

      if (!sanitizedAmount || parseFloat(sanitizedAmount) <= 0 || isNaN(parseFloat(sanitizedAmount))) {
          setError(t('payment.error_amount'));
          return;
      }
      if (!targetAddress || targetAddress.length < 40) {
          setError(t('payment.error_address'));
          return;
      }

      setIsProcessing(true);
      setError('');
      try {
          const txHash = await sendPayment(sanitizedAmount, targetAddress);
          if (onTransactionSuccess) {
              onTransactionSuccess(txHash, sanitizedAmount);
          }
      } catch (err: any) {
          console.error(err);
          setError(err.message || t('common.error'));
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-fade-in-up"
        style={{ animationDuration: '0.3s' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('common.close')}
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">{displayTitle}</h2>
            
            {/* Tabs */}
            {!isSalaryPayment && (
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button 
                        onClick={() => setActiveTab('crypto')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'crypto' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('payment.tab_crypto')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('traditional')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'traditional' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('payment.tab_traditional')}
                    </button>
                </div>
            )}

            {(activeTab === 'crypto' || isSalaryPayment) ? (
                <div className="text-center space-y-4">
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse ${isSalaryPayment ? 'bg-green-100' : 'bg-indigo-100'}`}>
                        {isSalaryPayment ? (
                            <UserIcon className="w-8 h-8 text-green-600" />
                        ) : (
                            <CubeTransparentIcon className="w-8 h-8 text-indigo-600" />
                        )}
                    </div>
                    
                    {!walletConnected ? (
                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                            {t('payment.connect_wallet_hint')}
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600">
                                {isSalaryPayment 
                                    ? t('payment.desc_salary')
                                    : t('payment.desc_deposit')
                                }
                            </p>
                            
                            <div className="text-left">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                                    {isSalaryPayment ? t('payment.label_recipient') : t('payment.label_fund')}
                                </label>
                                <input 
                                    type="text" 
                                    value={targetAddress}
                                    onChange={(e) => setTargetAddress(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono text-gray-600 bg-gray-50 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder={isSalaryPayment ? t('payment.hint_no_wallet') : "0x..."}
                                />
                                {isSalaryPayment && !targetAddress && (
                                    <p className="text-[10px] text-orange-500 mt-1 italic font-medium">
                                        * {t('payment.hint_no_wallet')}
                                    </p>
                                )}
                                {isSalaryPayment && targetAddress && (
                                     <p className="text-[10px] text-green-600 mt-1 italic font-medium flex items-center">
                                        ✓ {t('payment.hint_auto_fill')}
                                    </p>
                                )}
                            </div>

                            <div className="text-left">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment.label_amount')}</label>
                                <input 
                                    type="text" 
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    placeholder="0.01"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg font-bold text-indigo-700"
                                />
                            </div>
                            
                            {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

                            <button
                                onClick={handleCryptoPayment}
                                disabled={isProcessing}
                                className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-sm disabled:bg-gray-400 flex justify-center items-center ${isSalaryPayment ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isProcessing ? (
                                     <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : t('payment.btn_confirm')}
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheckIcon className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                        {t('payment.redirect_gov')}
                    </p>
                    <a
                        href={officialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
                    >
                        {t('payment.btn_continue')}
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 ml-2" />
                    </a>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
