import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    subscribeToConversations, 
    subscribeToMessages, 
    sendMessage,
    markConversationAsRead,
    markMessagesAsRead,
    deleteMessage
} from '../services/messagingService';
import { usePresence } from '../hooks/usePresence';
import type { Conversation, Message, ConversationParticipantInfo } from '../types';
import Spinner from './Spinner';
import UserIcon from './icons/UserIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CheckIcon from './icons/CheckIcon';
import CheckDoubleIcon from './icons/CheckDoubleIcon';
import TrashIcon from './icons/TrashIcon';
import { formatTimeAgo } from '../utils/formatters';

interface MessagingProps {
    initialSelectedConversationId: string | null;
    clearInitialSelection: () => void;
}

const MessageStatus: React.FC<{ status: 'sent' | 'read' }> = ({ status }) => {
  if (status === 'read') {
    return <CheckDoubleIcon className="w-4 h-4 text-blue-500" />;
  }
  return <CheckIcon className="w-4 h-4 text-gray-400" />;
};

const ConversationListItem: React.FC<{
    convo: Conversation;
    isActive: boolean;
    currentUserId: string;
    onClick: () => void;
}> = ({ convo, isActive, currentUserId, onClick }) => {
    const otherParticipantId = convo.participants.find(p => p !== currentUserId);
    const otherParticipantInfo = otherParticipantId ? convo.participantInfo[otherParticipantId] : null;
    const { isOnline } = usePresence(otherParticipantId || null);
    const unreadCount = convo.unreadCounts?.[currentUserId] || 0;

    return (
         <div
            onClick={onClick}
            className={`p-4 flex items-center space-x-3 cursor-pointer transition-colors ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
        >
            <div className="relative flex-shrink-0">
                {otherParticipantInfo?.profileImageUrl ? (
                    <img src={otherParticipantInfo.profileImageUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                    <UserIcon className="w-12 h-12" />
                )}
                {isOnline && <span className="w-3.5 h-3.5 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-white"></span>}
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className={`font-semibold text-gray-800 truncate ${unreadCount > 0 ? 'font-bold' : ''}`}>{otherParticipantInfo?.fullName}</p>
                    {unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">{unreadCount}</span>
                    )}
                </div>
                <p className={`text-sm truncate ${unreadCount > 0 ? 'text-indigo-700 font-semibold' : 'text-gray-500'}`}>{convo.lastMessage}</p>
            </div>
        </div>
    );
};


const Messaging: React.FC<MessagingProps> = ({ initialSelectedConversationId, clearInitialSelection }) => {
    const { currentUser, currentUserData } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const otherParticipantId = activeConversation?.participants.find(p => p !== currentUser?.uid) || null;
    const otherParticipantInfo = otherParticipantId && activeConversation ? activeConversation.participantInfo[otherParticipantId] : null;
    const { statusText: presenceStatusText } = usePresence(otherParticipantId);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Effect to subscribe to user's conversations
    useEffect(() => {
        if (!currentUser) return;
        setLoadingConversations(true);
        const unsubscribe = subscribeToConversations(currentUser.uid, (convos) => {
            setConversations(convos);
            setLoadingConversations(false);
            
            if (initialSelectedConversationId) {
                const initialConvo = convos.find(c => c.id === initialSelectedConversationId);
                if (initialConvo) {
                    setActiveConversation(initialConvo);
                }
                clearInitialSelection();
            }
        });
        return () => unsubscribe();
    }, [currentUser, initialSelectedConversationId, clearInitialSelection]);

    // Effect to subscribe to messages AND mark them as read
    useEffect(() => {
        if (!activeConversation || !currentUser) {
            setMessages([]);
            return;
        };
        setLoadingMessages(true);

        markConversationAsRead(activeConversation.id, currentUser.uid);
        markMessagesAsRead(activeConversation.id, currentUser.uid);

        const unsubscribe = subscribeToMessages(activeConversation.id, (msgs) => {
            setMessages(msgs);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [activeConversation, currentUser]);

    // Effect to scroll to the bottom of the message list
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation || !currentUser || !currentUserData?.fullName) return;

        setIsSending(true);
        try {
            await sendMessage(activeConversation.id, currentUser.uid, currentUserData.fullName, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    const handleDeleteMessage = async (message: Message) => {
        if (!currentUser || !activeConversation || message.senderId !== currentUser.uid) return;

        if (window.confirm('Bạn có chắc muốn thu hồi tin nhắn này không?')) {
            try {
                await deleteMessage(activeConversation.id, message.id, currentUser.uid, message.senderId);
            } catch (error) {
                console.error("Failed to delete message:", error);
                alert("Đã có lỗi xảy ra khi thu hồi tin nhắn.");
            }
        }
    };
    
    const isMobileView = window.innerWidth < 768;
    const showConversationList = !isMobileView || (isMobileView && !activeConversation);
    const showChatWindow = !isMobileView || (isMobileView && activeConversation);

    return (
        <div className="flex h-full bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            {showConversationList && (
                <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${!activeConversation && isMobileView ? '' : 'hidden md:flex'}`}>
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800">Tin nhắn</h2>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {loadingConversations ? <Spinner /> : conversations.length > 0 ? (
                            conversations.map(convo => (
                                <ConversationListItem
                                    key={convo.id}
                                    convo={convo}
                                    isActive={activeConversation?.id === convo.id}
                                    currentUserId={currentUser!.uid}
                                    onClick={() => setActiveConversation(convo)}
                                />
                            ))
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <p>Chưa có cuộc trò chuyện nào.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showChatWindow && (
                <div className="w-full md:w-2/3 flex flex-col">
                    {activeConversation ? (
                        <>
                            <div className="p-4 border-b border-gray-200 flex items-center space-x-3">
                                {isMobileView && (
                                    <button onClick={() => setActiveConversation(null)} className="p-2 rounded-full hover:bg-gray-100">
                                        <ArrowLeftIcon className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="relative flex-shrink-0">
                                    {otherParticipantInfo?.profileImageUrl ? (
                                        <img src={otherParticipantInfo.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-10 h-10" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{otherParticipantInfo?.fullName}</h3>
                                    {presenceStatusText && <p className="text-xs text-gray-500">{presenceStatusText}</p>}
                                </div>
                            </div>
                            <div className="flex-grow p-4 space-y-2 overflow-y-auto bg-gray-50">
                                {loadingMessages ? <Spinner /> : messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col group ${msg.senderId === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-2 ${msg.senderId === currentUser?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                                           {msg.senderId === currentUser?.uid && !msg.deleted && (
                                                <button onClick={() => handleDeleteMessage(msg)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 mb-1">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl break-words whitespace-pre-wrap ${
                                                msg.deleted
                                                    ? 'bg-transparent text-gray-500 italic'
                                                    : msg.senderId === currentUser?.uid
                                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                                            }`}>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                        </div>
                                         {!msg.deleted && (
                                            <div className={`flex items-center text-xs text-gray-400 mt-1 px-1`}>
                                                <span className="mr-1">{formatTimeAgo(msg.timestamp)}</span>
                                                {msg.senderId === currentUser?.uid && <MessageStatus status={msg.status} />}
                                            </div>
                                         )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-4 bg-white border-t border-gray-200">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1 p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500"
                                        disabled={isSending}
                                    />
                                    <button type="submit" disabled={isSending || !newMessage.trim()} className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors">
                                        <PaperAirplaneIcon className="h-6 w-6" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
                            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold">Chọn một cuộc trò chuyện</h3>
                            <p>Bắt đầu liên lạc với nhà tuyển dụng hoặc người lao động tại đây.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Messaging;