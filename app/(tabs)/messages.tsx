import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../../components/PageHeader';

type Conversation = {
  id: string;
  updated_at: string;
  participants: {
    user: {
      id: string;
      full_name: string;
      photos: string[] | null;
    };
  }[];
  latest_message: {
    content: string;
    created_at: string;
    sender: {
      id: string;
      full_name: string;
    };
  } | null;
  unread_count: number;
};

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    fetchConversations();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      messagesChannel.unsubscribe();
    };
  }, [session]);

  const fetchConversations = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          participants:conversation_participants(
            user:user_id(
              id,
              full_name,
              photos
            )
          ),
          latest_message:messages(
            content,
            created_at,
            sender:sender_id(
              id,
              full_name
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform data to include unread count and filter out current user
      const transformedData = await Promise.all(
        data.map(async (conversation) => {
          // Get unread count
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', conversation.id)
            .is('read_at', null)
            .neq('sender_id', session.user.id);

          // Filter out current user from participants
          const otherParticipants = conversation.participants.filter(
            (p) => p.user.id !== session.user.id
          );

          return {
            ...conversation,
            participants: otherParticipants,
            latest_message: conversation.latest_message?.[0] || null,
            unread_count: count || 0,
          };
        })
      );

      setConversations(transformedData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleConversationPress = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Messages" />
        <View style={styles.authContainer}>
          <View style={styles.welcomeSection}>
            <Ionicons name="chatbubbles-outline" size={80} color={colors.primary} />
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Start Messaging
            </Text>
            <Text style={[styles.welcomeText, { color: colors.secondary }]}>
              Sign in to connect and chat with other community members
            </Text>
            <Pressable
              style={[styles.signInButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/sign-in')}>
              <Text style={[styles.signInButtonText, { color: colors.background }]}>
                Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Messages" />
      
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      ) : (
        <ScrollView style={styles.scrollView}>
          {conversations.map((conversation) => {
            const otherUser = conversation.participants[0]?.user;
            if (!otherUser) return null;

            return (
              <Pressable
                key={conversation.id}
                style={[
                  styles.conversationItem,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => handleConversationPress(conversation.id)}>
                <View style={styles.avatar}>
                  {otherUser.photos?.[0] ? (
                    <Image
                      source={{ uri: otherUser.photos[0] }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: colors.surface },
                      ]}>
                      <Ionicons
                        name="person"
                        size={24}
                        color={colors.secondary}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text
                      style={[
                        styles.userName,
                        { color: colors.text },
                        conversation.unread_count > 0 && styles.unreadText,
                      ]}>
                      {otherUser.full_name}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.secondary }]}>
                      {conversation.latest_message
                        ? formatDate(conversation.latest_message.created_at)
                        : formatDate(conversation.updated_at)}
                    </Text>
                  </View>

                  <View style={styles.messagePreview}>
                    <Text
                      style={[
                        styles.previewText,
                        { color: colors.secondary },
                        conversation.unread_count > 0 && styles.unreadText,
                      ]}
                      numberOfLines={1}>
                      {conversation.latest_message?.content || 'No messages yet'}
                    </Text>
                    {conversation.unread_count > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: colors.primary },
                        ]}>
                        <Text style={[styles.unreadCount, { color: colors.background }]}>
                          {conversation.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

          {conversations.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={colors.secondary}
              />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                No Messages Yet
              </Text>
              <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
                Start a conversation by visiting someone's profile
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  signInButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});