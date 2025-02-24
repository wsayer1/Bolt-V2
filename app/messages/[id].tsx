import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  read_at: string | null;
};

type Participant = {
  user: {
    id: string;
    full_name: string;
    photos: string[] | null;
  };
};

export default function ConversationScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!session) {
      router.replace('/sign-in');
      return;
    }

    fetchConversation();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          // Add new message to state
          setMessages((current) => [...current, payload.new as Message]);
          // Mark message as read if it's from the other user
          if (payload.new.sender_id !== session.user.id) {
            markMessageAsRead(payload.new.id);
          }
          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, session]);

  const fetchConversation = async () => {
    if (!session) return;

    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user:user_id(id, full_name, photos)')
        .eq('conversation_id', id);

      if (participantsError) throw participantsError;
      setParticipants(participantsData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData);

      // Mark unread messages as read
      const unreadMessages = messagesData.filter(
        (msg) => !msg.read_at && msg.sender_id !== session.user.id
      );
      
      for (const message of unreadMessages) {
        await markMessageAsRead(message.id);
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load conversation',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSend = async () => {
    if (!session || !newMessage.trim()) return;

    try {
      setIsSending(true);

      const { error } = await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: session.user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const otherUser = participants.find(
    (p) => p.user.id !== session?.user.id
  )?.user;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {otherUser && (
          <View style={styles.headerContent}>
            {otherUser.photos?.[0] ? (
              <Image
                source={{ uri: otherUser.photos[0] }}
                style={styles.headerAvatar}
              />
            ) : (
              <View
                style={[
                  styles.headerAvatarPlaceholder,
                  { backgroundColor: colors.surface },
                ]}>
                <Ionicons name="person" size={20} color={colors.secondary} />
              </View>
            )}
            <Text style={[styles.headerName, { color: colors.text }]}>
              {otherUser.full_name}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}>
        {messages.map((message, index) => {
          const isFirstMessageOfDay =
            index === 0 ||
            new Date(message.created_at).toDateString() !==
              new Date(messages[index - 1].created_at).toDateString();

          const isFromMe = message.sender_id === session?.user.id;

          return (
            <React.Fragment key={message.id}>
              {isFirstMessageOfDay && (
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateHeaderText, { color: colors.secondary }]}>
                    {formatDate(message.created_at)}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.messageWrapper,
                  isFromMe ? styles.myMessageWrapper : styles.theirMessageWrapper,
                ]}>
                <View
                  style={[
                    styles.messageBubble,
                    isFromMe
                      ? [styles.myMessage, { backgroundColor: colors.primary }]
                      : [styles.theirMessage, { backgroundColor: colors.surface }],
                  ]}>
                  <Text
                    style={[
                      styles.messageText,
                      { color: isFromMe ? colors.background : colors.text },
                    ]}>
                    {message.content}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.messageTime,
                    { color: colors.secondary },
                    isFromMe && styles.myMessageTime,
                  ]}>
                  {formatTime(message.created_at)}
                  {isFromMe && (
                    <Text style={styles.readStatus}>
                      {message.read_at ? ' ✓✓' : ' ✓'}
                    </Text>
                  )}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </ScrollView>

      <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.text },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.secondary}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}>
          {isSending ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Ionicons name="send" size={20} color={colors.background} />
          )}
        </Pressable>
      </View>
      <Toast />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  theirMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  myMessage: {
    borderTopRightRadius: 4,
  },
  theirMessage: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  readStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
});