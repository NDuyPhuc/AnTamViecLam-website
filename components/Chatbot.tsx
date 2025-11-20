import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToBot } from '../services/geminiService';
import { ChatMessage, MessageAuthor, Job } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: MessageAuthor.Bot, text: 'Xin chào! Tôi có thể giúp gì cho bạn về công việc hoặc chính sách bảo hiểm xã hội?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { author: MessageAuthor.User, text: input };
    
    // Keep a reference to the current history BEFORE adding the new message
    // because the new message is sent as the 'prompt' in the API call.
    const currentHistory = [...messages];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const appContext = {
        jobs: allJobs,
        insuranceInfo: MOCK_INSURANCE_DATA,
        projectContext: PROJECT_CONTEXT,
      };
      
      // Pass the history (excluding the just-added message which is handled as the 'prompt' inside the service/backend)
      // Wait, actually, let's pass the history as context.
      // The service will take 'input' as the new prompt.
      
      const botResponseText = await sendMessageToBot(input, currentHistory, appContext);
      
      const botMessage: ChatMessage = { author: MessageAuthor.Bot, text: botResponseText };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { author: MessageAuthor.Bot, text: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden">
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