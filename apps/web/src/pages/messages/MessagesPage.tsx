import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import { MessageSquare, Send } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, Skeleton } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/StateViews';
import { api, getApiErrorMessage } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface ChatMessage {
  senderId?: string;
  role: string;
  content: string;
  createdAt: string;
}

export const MessagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useToastStore((s) => s.pushToast);

  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [text, setText] = useState('');

  const contactsQuery = useQuery({
    queryKey: ['messages', 'contacts'],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ contacts: Contact[] }>>('/messages/contacts');
      return res.data.data.contacts;
    },
  });

  useEffect(() => {
    if (!selectedPeerId && contactsQuery.data && contactsQuery.data.length > 0) {
      setSelectedPeerId(contactsQuery.data[0].id);
    }
  }, [contactsQuery.data, selectedPeerId]);

  const threadQuery = useQuery({
    queryKey: ['messages', 'thread', selectedPeerId],
    enabled: Boolean(selectedPeerId),
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ messages: ChatMessage[] }>>('/messages', {
        params: { peerUserId: selectedPeerId },
      });
      return res.data.data.messages;
    },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post('/messages', { peerUserId: selectedPeerId, content });
    },
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', selectedPeerId] });
    },
    onError: (err) => {
      pushToast({ variant: 'error', title: 'Send failed', description: getApiErrorMessage(err) });
    },
  });

  const contacts = contactsQuery.data || [];
  const messages = threadQuery.data || [];
  const activeContact = contacts.find((c) => c.id === selectedPeerId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fitcore-accent">
            Trainer & Member Communication
          </p>
          <h1 className="mt-1 font-['Manrope'] text-2xl font-extrabold text-white">
            Coaching Messages
          </h1>
        </div>

        {contactsQuery.isLoading ? (
          <Skeleton className="h-72" />
        ) : contacts.length === 0 ? (
          <EmptyState
            title="No coaching contacts available yet"
            description="Trainers see their assigned members here, and members see their assigned personal trainer."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-2 p-3">
              <p className="px-2 py-1 text-xs font-semibold uppercase text-fitcore-muted">
                Contacts
              </p>
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedPeerId(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selectedPeerId === c.id
                      ? 'bg-fitcore-accent text-black font-semibold'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  <div>
                    <p>
                      {c.firstName} {c.lastName}
                    </p>
                    <p
                      className={`text-xs ${
                        selectedPeerId === c.id ? 'text-black/70' : 'text-fitcore-muted'
                      }`}
                    >
                      {c.email}
                    </p>
                  </div>
                  <Badge variant={selectedPeerId === c.id ? 'neutral' : 'accent'}>
                    {c.role}
                  </Badge>
                </button>
              ))}
            </Card>

            <Card className="flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="mb-4 flex items-center gap-2 border-b border-fitcore-border pb-3">
                  <MessageSquare className="h-4 w-4 text-fitcore-accent" />
                  <span className="font-semibold text-white">
                    {activeContact
                      ? `${activeContact.firstName} ${activeContact.lastName}`
                      : 'Conversation'}
                  </span>
                </div>

                <div className="mb-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <p className="py-12 text-center text-xs text-fitcore-muted">
                      No messages yet. Send a message below to start the conversation.
                    </p>
                  ) : (
                    messages.map((m, i) => {
                      const isMine = m.senderId === user?.id;
                      return (
                        <div
                          key={i}
                          className={`max-w-md rounded-xl px-3.5 py-2.5 text-sm ${
                            isMine
                              ? 'ml-auto bg-fitcore-accent text-black font-medium'
                              : 'mr-auto border border-fitcore-border bg-[#141618] text-white'
                          }`}
                        >
                          <p>{m.content}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isMine ? 'text-black/60' : 'text-fitcore-muted'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) sendMutation.mutate(text.trim());
                }}
                className="flex gap-2 border-t border-fitcore-border pt-3"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message..."
                  className="fitcore-input flex-1"
                />
                <Button type="submit" isLoading={sendMutation.isPending} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

