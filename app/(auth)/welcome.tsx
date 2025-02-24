import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session?.user.id) {
      router.replace('/sign-in');
    }
  }, [session]);

  const handleSave = async () => {
    if (!session?.user.id) {
      setError('Not authenticated');
      return;
    }

    if (!fullName) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Extract first name from full name
      const firstName = fullName.split(' ')[0];

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          first_name: firstName,
          birthday: birthday?.toISOString().split('T')[0],
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been updated successfully',
      });

      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Failed to save profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user.id) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome to Community
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Let's get to know you better
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.secondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Birthday</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={birthday?.toISOString().split('T')[0] || ''}
                onChange={(e) => setBirthday(new Date(e.target.value))}
                style={{
                  height: 48,
                  borderRadius: 8,
                  borderWidth: 1,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  width: '100%',
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                }}
              />
            ) : (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.secondary}
                value={birthday?.toISOString().split('T')[0] || ''}
                onChangeText={(text) => setBirthday(new Date(text))}
              />
            )}
          </View>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Save Profile
              </Text>
            )}
          </Pressable>
        </View>
      </View>
      <Toast />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});