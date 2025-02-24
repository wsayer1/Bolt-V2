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
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type UserProfile = {
  full_name: string;
  birthday: string | null;
  hometown: string | null;
  current_location: string | null;
  languages: string | null;
  hobbies: string | null;
  bio: string | null;
  photos: string[] | null;
};

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    birthday: null,
    hometown: null,
    current_location: null,
    languages: null,
    hobbies: null,
    bio: null,
    photos: null,
  });
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      fetchProfile();
    } else {
      router.replace('/sign-in');
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      if (data.birthday) {
        setBirthday(new Date(data.birthday));
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      setError(null);

      // For web, we need to convert the uri to a File object
      let file;
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        file = blob;
      }

      const fileName = `${session!.user.id}/${Date.now()}.jpg`;
      const { error: uploadError, data } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Update profile with new photo
      const updatedPhotos = [...(profile.photos || [])];
      if (updatedPhotos.length >= 3) {
        updatedPhotos.pop(); // Remove the last photo if we already have 3
      }
      updatedPhotos.unshift(publicUrl); // Add new photo at the beginning

      const { error: updateError } = await supabase
        .from('users')
        .update({
          photos: updatedPhotos,
        })
        .eq('id', session!.user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, photos: updatedPhotos });
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async (index: number) => {
    try {
      const updatedPhotos = [...(profile.photos || [])];
      updatedPhotos.splice(index, 1);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          photos: updatedPhotos,
        })
        .eq('id', session!.user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, photos: updatedPhotos });
    } catch (err: any) {
      console.error('Error removing photo:', err);
      setError('Failed to remove photo');
    }
  };

  const handleReorderPhotos = async (fromIndex: number, toIndex: number) => {
    try {
      const updatedPhotos = [...(profile.photos || [])];
      const [movedPhoto] = updatedPhotos.splice(fromIndex, 1);
      updatedPhotos.splice(toIndex, 0, movedPhoto);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          photos: updatedPhotos,
        })
        .eq('id', session!.user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, photos: updatedPhotos });
    } catch (err: any) {
      console.error('Error reordering photos:', err);
      setError('Failed to reorder photos');
    }
  };

  const handleSave = async () => {
    if (!session?.user.id) return;

    try {
      setIsSaving(true);
      setError(null);

      const updates = {
        ...profile,
        birthday: birthday?.toISOString().split('T')[0],
        first_name: profile.full_name.split(' ')[0],
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      router.back();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhotoSection = () => (
    <View style={styles.photoSection}>
      <Text style={[styles.label, { color: colors.text }]}>Photos</Text>
      <Text style={[styles.photoHelp, { color: colors.secondary }]}>
        Add up to 3 photos. Use arrows to reorder - the first photo will be your profile picture.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoList}
        contentContainerStyle={styles.photoListContent}>
        <Pressable
          onPress={handleImagePick}
          style={[
            styles.addPhotoButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          {isUploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="add" size={24} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary }]}>
                Add Photo
              </Text>
            </>
          )}
        </Pressable>
        {profile.photos?.map((photo, index) => (
          <View key={photo} style={styles.photoContainer}>
            <Pressable
              onPress={() => {
                if (index > 0) {
                  handleReorderPhotos(index, index - 1);
                }
              }}
              style={[
                styles.reorderButton,
                styles.reorderButtonLeft,
                { opacity: index === 0 ? 0.3 : 1 },
              ]}
              disabled={index === 0}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Image source={{ uri: photo }} style={styles.photo} />
            <Pressable
              onPress={() => handleRemovePhoto(index)}
              style={styles.removePhotoButton}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (index < profile.photos!.length - 1) {
                  handleReorderPhotos(index, index + 1);
                }
              }}
              style={[
                styles.reorderButton,
                styles.reorderButtonRight,
                { opacity: index === profile.photos!.length - 1 ? 0.3 : 1 },
              ]}
              disabled={index === profile.photos!.length - 1}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            {renderPhotoSection()}

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
                value={profile.full_name}
                onChangeText={(text) => setProfile({ ...profile, full_name: text })}
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
                <>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        justifyContent: 'center',
                      },
                    ]}>
                    <Text style={{ color: colors.text }}>
                      {birthday ? birthday.toLocaleDateString() : 'Select date'}
                    </Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={birthday || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setBirthday(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Tell us about yourself"
                placeholderTextColor={colors.secondary}
                value={profile.bio || ''}
                onChangeText={(text) => setProfile({ ...profile, bio: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Hometown</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Where are you from?"
                placeholderTextColor={colors.secondary}
                value={profile.hometown || ''}
                onChangeText={(text) => setProfile({ ...profile, hometown: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Current Location</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Where do you live now?"
                placeholderTextColor={colors.secondary}
                value={profile.current_location || ''}
                onChangeText={(text) => setProfile({ ...profile, current_location: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Languages</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Languages you speak"
                placeholderTextColor={colors.secondary}
                value={profile.languages || ''}
                onChangeText={(text) => setProfile({ ...profile, languages: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Hobbies</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your hobbies and interests"
                placeholderTextColor={colors.secondary}
                value={profile.hobbies || ''}
                onChangeText={(text) => setProfile({ ...profile, hobbies: text })}
              />
            </View>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isSaving && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Save Changes
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  photoSection: {
    gap: 12,
    marginTop: 16,
  },
  photoHelp: {
    fontSize: 14,
    lineHeight: 20,
  },
  photoList: {
    flexDirection: 'row',
  },
  photoListContent: {
    paddingVertical: 12,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  reorderButton: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    top: '50%',
    marginTop: -12,
  },
  reorderButtonLeft: {
    left: -12,
  },
  reorderButtonRight: {
    right: -12,
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
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
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