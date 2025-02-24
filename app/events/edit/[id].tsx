import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  image_url: string;
  max_attendees: number | null;
  host_id: string;
};

export default function EditEventScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    time: '',
    maxAttendees: '',
    imageUrl: '',
  });

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data.host_id !== session?.user.id) {
        Toast.show({
          type: 'error',
          text1: 'Unauthorized',
          text2: 'You can only edit events you are hosting',
        });
        router.back();
        return;
      }

      setEvent(data);

      const eventDate = new Date(data.date);
      setFormData({
        title: data.title,
        description: data.description,
        location: data.location,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().split(' ')[0].slice(0, 5),
        maxAttendees: data.max_attendees?.toString() || '',
        imageUrl: data.image_url || '',
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load event details',
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      const updates = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        date: eventDateTime.toISOString(),
        image_url: formData.imageUrl || event?.image_url,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
      };

      // Update the event in Supabase
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Event Updated',
        text2: 'Your event has been updated successfully',
      });

      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error updating event:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update event',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete this event?')) {
        return;
      }
    } else {
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ],
      );
      return;
    }
    await confirmDelete();
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Event Deleted',
        text2: 'Your event has been deleted successfully',
      });

      router.replace('/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete event',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Edit Event</Text>
      </View>

      <ScrollView style={styles.scrollView}>
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
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Save Changes
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.deleteButton,
              { backgroundColor: colors.error },
              isDeleting && styles.buttonDisabled,
            ]}
            onPress={handleDelete}
            disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Delete Event
              </Text>
            )}
          </Pressable>
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
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
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
  deleteButton: {
    height: 48,
    borderRadius: 24,
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