
import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToBot } from '../services/geminiService';
import { subscribeToAiChatHistory, saveAiChatMessage, clearAiChatHistory } from '../services/aiChatService';
import { useAuth } from '../contexts/AuthContext';
import { ChatMessage, MessageAuthor, Job } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';
import TrashIcon from './icons/TrashIcon';
import { MOCK_INSURANCE_DATA, PROJECT_CONTEXT } from '../constants';

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.author === MessageAuthor.User;
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <BotIcon />}
            <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${isUser ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
            {isUser && <UserIcon />}
        </div>
    );
};

interface ChatbotProps {
    allJobs: Job[];
}

const Chatbot: React.FC<ChatbotProps> = ({ allJobs }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lời chào mặc định
  const defaultGreeting: ChatMessage = { 
      author: MessageAuthor.Bot, 
      text: 'Xin chào! Tôi có thể giúp gì cho bạn về công việc hoặc chính sách bảo hiểm xã hội?' 
  };

  // Subscribe to Firestore history
  useEffect(() => {
      if (!currentUser) return;

      const unsubscribe = subscribeToAiChatHistory(currentUser.uid, (history) => {
          if (history.length === 0) {
              setMessages([defaultGreeting]);
          } else {
              setMessages(history);
          }
      });

      return () => unsubscribe();
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentUser) return;

    const userInput = input;
    const userMessage: ChatMessage = { author: MessageAuthor.User, text: userInput };
    
    setInput('');
    setIsLoading(true);

    try {
      // 1. Lưu tin nhắn User vào Firestore
      await saveAiChatMessage(currentUser.uid, userMessage);

      const appContext = {
        jobs: allJobs,
        insuranceInfo: MOCK_INSURANCE_DATA,
        projectContext: PROJECT_CONTEXT,
      };
      
      // 2. Gọi AI (Gửi kèm lịch sử hiện tại để AI nhớ ngữ cảnh)
      // Lưu ý: messages lúc này chưa có tin nhắn mới nhất do async của Firestore, 
      // nên ta tạo mảng tempHistory để gửi đi.
      const tempHistory = [...messages, userMessage];
      
      const botResponseText = await sendMessageToBot(userInput, tempHistory, appContext);
      
      // 3. Lưu tin nhắn Bot vào Firestore
      const botMessage: ChatMessage = { author: MessageAuthor.Bot, text: botResponseText };
      await saveAiChatMessage(currentUser.uid, botMessage);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = { author: MessageAuthor.Bot, text: 'Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.' };
      // Không lưu tin nhắn lỗi vào DB để tránh rác, chỉ hiện tạm thời hoặc lưu nếu cần
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
      if (!currentUser) return;
      if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện không?")) {
          await clearAiChatHistory(currentUser.uid);
          setMessages([defaultGreeting]);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden relative">
        {/* Header nhỏ cho Chatbot */}
        <div className="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-gray-500">Trợ lý AI trực tuyến</span>
            </div>
            {messages.length > 1 && (
                <button 
                    onClick={handleClearHistory}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Xóa lịch sử trò chuyện"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {messages.map((msg, index) => (
                <ChatBubble key={index} message={msg} />
            ))}
            {isLoading && (
                <div className="flex items-start gap-3">
                    <BotIcon />
                    <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                        <div className="flex items-center space-x-1">
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-gray-50 border-t">
            <form onSubmit={handleSend} className="flex items-center space-x-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập câu hỏi của bạn..."
                    className="flex-1 p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-300"
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </form>
        </div>
    </div>
  );
};

export default Chatbot;
