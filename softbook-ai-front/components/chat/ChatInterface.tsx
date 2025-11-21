'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface Technology {
    id: string;
    name: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    references?: Array<{
        id: string;
        chunk: string;
        source: string;
        position: number;
    }>;
}

const cleanAssistantContent = (raw: string) => {
    if (!raw) {
        return '';
    }

    const normalized = raw.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const cleaned: string[] = [];
    let previousMeaningful = '';

    for (const line of lines) {
        const trimmed = line.trim();
        const isEmpty = trimmed.length === 0;

        if (isEmpty) {
            if (cleaned.length === 0 || cleaned[cleaned.length - 1] === '') {
                continue;
            }
            cleaned.push('');
            previousMeaningful = '';
            continue;
        }

        if (trimmed === previousMeaningful) {
            continue;
        }

        cleaned.push(line);
        previousMeaningful = trimmed;
    }

    return cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

export default function ChatInterface() {
    const [technologies, setTechnologies] = useState<Technology[]>([]);
    const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_SOFTBOOK_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
                return;
            }
            fetchTechnologies();
        }
    }, [user, authLoading, router]);

    const fetchTechnologies = async () => {
        try {
            const res = await fetch(`${API_URL}/technologies`);
            if (res.ok) {
                const data = await res.json();
                setTechnologies(data);
            }
        } catch (error) {
            console.error('Failed to fetch technologies', error);
        }
    };

    const handleToggleTech = (id: string) => {
        setSelectedTechIds(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    const handleSendMessage = async (content: string) => {
        console.log('[ChatInterface] handleSendMessage called with:', content);

        const userMessage: Message = { role: 'user', content };
        const assistantMessage: Message = { role: 'assistant', content: '' };
        const historyWithUser = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

        setMessages(prev => {
            console.log('[ChatInterface] Queuing user and assistant placeholders. Prev count:', prev.length);
            return [...prev, userMessage, assistantMessage];
        });
        setIsLoading(true);

        try {
            console.log('[ChatInterface] Fetching from API...');
            const res = await fetch(`${API_URL}/chat/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: content,
                    technologyIds: selectedTechIds.length > 0 ? selectedTechIds : undefined,
                    conversationHistory: historyWithUser,
                }),
            });

            console.log('[ChatInterface] Response received. Status:', res.status);

            if (!res.ok) throw new Error('Failed to get response');
            if (!res.body) throw new Error('No response body');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let fullAssistantResponse = '';

            console.log('[ChatInterface] Starting stream reading...');
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value || new Uint8Array(), { stream: true });

                if (!chunkValue) {
                    continue;
                }

                console.log('[ChatInterface] Chunk received:', {
                    done,
                    chunkLength: chunkValue.length,
                    preview: chunkValue.substring(0, 50),
                    raw: chunkValue
                });

                fullAssistantResponse += chunkValue;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                        lastMessage.content += chunkValue;
                    }
                    return newMessages;
                });
            }
            console.log('[ChatInterface] Stream finished.');

            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant') {
                    const cleanedContent = cleanAssistantContent(fullAssistantResponse);
                    lastMessage.content = cleanedContent || fullAssistantResponse;
                }
                return newMessages;
            });
        } catch (error) {
            console.error('[ChatInterface] Chat error:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'assistant') {
                    lastMessage.content += '\n\n[Error: Failed to complete response. Please try again.]';
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || !user) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
                technologies={technologies}
                selectedTechIds={selectedTechIds}
                onToggleTech={handleToggleTech}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onLogout={logout}
            />
            <ChatArea
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />
        </div>
    );
}
