import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function CreateEventScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    time: '',
    maxAttendees: '',
    imageUrl: '',
  });

  const handleSubmit = async () => {
    if (!session) {
      router.push('/sign-in');
      return;
    }

    // Basic validation
    if (!formData.title || !formData.description || !formData.location || !formData.date) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Combine date and time
      const eventDateTime = new Date(`${formData.date}T${formData.time || '00:00'}`);

      const { error } = await supabase.from('events').insert({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: eventDateTime.toISOString(),
        image_url: formData.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
        max_attendees: parseInt(formData.maxAttendees) || null,
        host_id: session.user.id,
      });

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Event Created',
        text2: 'Your event has been created successfully',
      });

      router.push('/events');
    } catch (error) {
      console.error('Error creating event:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create event',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Create Event</Text>
        <Pressable
          style={[styles.cancelButton, { backgroundColor: colors.surface }]}
          onPress={handleCancel}>
          <Text style={[styles.cancelButtonText, { color: colors.error }]}>
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Event title"
              placeholderTextColor={colors.secondary}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Event description"
              placeholderTextColor={colors.secondary}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Event location"
              placeholderTextColor={colors.secondary}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Date *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.secondary}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Time</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
                placeholder="HH:MM"
                placeholderTextColor={colors.secondary}
                value={formData.time}
                onChangeText={(text) => setFormData({ ...formData, time: text })}
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Maximum Attendees</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={colors.secondary}
              value={formData.maxAttendees}
              onChangeText={(text) => setFormData({ ...formData, maxAttendees: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Image URL</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Image URL (optional)"
              placeholderTextColor={colors.secondary}
              value={formData.imageUrl}
              onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
            />
          </View>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.background }]}>
                Create Event
              </Text>
            )}
          </Pressable>

          {/* Bottom margin */}
          <View style={styles.bottomMargin} />
        </View>
      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  form: {
    padding: 16,
    gap: 16,
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
  textArea: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomMargin: {
    height: '20vh',
  },
});