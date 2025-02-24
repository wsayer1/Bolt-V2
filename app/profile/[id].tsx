import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StartChatButton from '../../components/StartChatButton';

type UserProfile = {
  id: string;
  full_name: string;
  first_name: string;
  birthday: string | null;
  hometown: string | null;
  current_location: string | null;
  languages: string[] | null;
  hobbies: string[] | null;
  bio: string | null;
  photos: string[] | null;
};

export default function ProfileView() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/community')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <StartChatButton userId={profile.id} variant="icon" />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.photoSection}>
          {profile.photos && profile.photos.length > 0 ? (
            <Image
              source={{ uri: profile.photos[0] }}
              style={styles.mainPhoto}
            />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="person-outline" size={48} color={colors.secondary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.photoOverlay}>
            <Text style={styles.name}>{profile.full_name}</Text>
            <Text style={styles.location}>
              {profile.current_location || profile.hometown || 'No location set'}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {profile.bio && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
              <Text style={[styles.bioText, { color: colors.text }]}>{profile.bio}</Text>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
            
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="home-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.secondary }]}>Hometown</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {profile.hometown || 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="location-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.secondary }]}>Current Location</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {profile.current_location || 'Not set'}
                </Text>
              </View>
            </View>

            {profile.languages && profile.languages.length > 0 && (
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="language-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.secondary }]}>Languages</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}
                  </Text>
                </View>
              </View>
            )}

            {profile.hobbies && profile.hobbies.length > 0 && (
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Ionicons name="heart-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.secondary }]}>Interests</Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {Array.isArray(profile.hobbies) ? profile.hobbies.join(', ') : profile.hobbies}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {profile.photos && profile.photos.length > 1 && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.photoGrid}
              >
                {profile.photos.slice(1).map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.gridPhoto}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    position: 'relative',
    height: 300,
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  location: {
    color: 'white',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
  },
  photoGrid: {
    flexDirection: 'row',
  },
  gridPhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
});