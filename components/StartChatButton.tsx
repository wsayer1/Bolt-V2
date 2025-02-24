import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

type StartChatButtonProps = {
  userId: string;
  variant?: 'icon' | 'button';
};

export default function StartChatButton({ userId, variant = 'button' }: StartChatButtonProps) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (!session) {
      router.push('/sign-in');
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .rpc('start_conversation', {
          other_user_id: userId,
        });

      if (error) throw error;

      if (!data || !data[0]?.conversation_id) {
        throw new Error('Failed to start conversation');
      }

      router.push(`/messages/${data[0].conversation_id}`);
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start conversation',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Pressable
        style={[styles.iconButton, { backgroundColor: colors.surface }]}
        onPress={handlePress}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chatbubble" size={20} color={colors.primary} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.surface }]}
      onPress={handlePress}
      disabled={isLoading}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Ionicons name="chatbubble" size={20} color={colors.primary} />
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Message
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});