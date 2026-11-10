import { useMutation } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@fitcore/shared-types';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BadgePill, FitButton, FitCard, FitInput, ScreenContainer } from '../../src/components/ui';
import { mobileApi } from '../../src/lib/api';

export default function MobileAssistantScreen() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Ask about bench press progression, squat alternatives, post-workout meals, or analyze your workout performance.',
    },
  ]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await mobileApi.post<ApiSuccessResponse<{ reply: string }>>('/ai/chat', {
        message,
      });
      return res.data.data.reply;
    },
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    },
  });

  const handleAsk = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    chatMutation.mutate(trimmed);
  };

  return (
    <ScreenContainer>
      <BadgePill label="AI FITNESS ASSISTANT" accent />
      <Text style={styles.title}>Coach Chat</Text>

      {messages.map((m, idx) => (
        <FitCard
          key={idx}
          style={m.role === 'user' ? { borderColor: FITCORE_THEME.primaryAccent } : undefined}
        >
          <Text style={styles.role}>{m.role === 'user' ? 'YOU' : 'FITCORE AI'}</Text>
          <Text style={styles.body}>{m.text}</Text>
        </FitCard>
      ))}

      <FitInput
        placeholder="Ask: Analyze my workout performance"
        value={question}
        onChangeText={setQuestion}
      />
      <FitButton label="Send" onPress={handleAsk} loading={chatMutation.isPending} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: FITCORE_THEME.primaryText, fontSize: 24, fontWeight: '800', marginTop: 10, marginBottom: 16 },
  role: { color: FITCORE_THEME.primaryAccent, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  body: { color: FITCORE_THEME.primaryText, fontSize: 14, lineHeight: 20 },
});
