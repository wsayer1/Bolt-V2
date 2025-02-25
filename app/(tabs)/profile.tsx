import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation, Link } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import { supabase } from '../../lib/supabase';

type UserProfile = {
  full_name: string | null;
  first_name: string | null;
  birthday: string | null;
  hometown: string | null;
  current_location: string | null;
  languages: string | null;
  hobbies: string | null;
  bio: string | null;
  photos: string[] | null;
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const navigation = useNavigation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Set up real-time subscription
  useEffect(() => {
    if (!session?.user.id) return;

    const channel = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          setUserProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  // Initial profile fetch
  useEffect(() => {
    if (session?.user.id) {
      fetchUserProfile();
    }
  }, [session, retryCount]);

  // Focus listener to refresh profile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (session?.user.id) {
        fetchUserProfile();
      }
    });

    return unsubscribe;
  }, [navigation, session]);

  const fetchUserProfile = async () => {
    if (!session?.user.id) return;

    try {
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        if (error.code === 'PGRST116' && retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
          return;
        }
        
        setError('Failed to load profile data');
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderEditButton = () => {
    if (Platform.OS === 'web') {
      return (
        <Pressable
          onPress={handleEditProfile}
          style={({ pressed }) => [
            styles.editButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="pencil" size={24} color={colors.primary} />
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={handleEditProfile}
        style={({ pressed }) => [
          styles.mobileEditButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Ionicons name="pencil" size={20} color={colors.background} />
        <Text style={[styles.mobileEditButtonText, { color: colors.background }]}>
          Edit Profile
        </Text>
      </Pressable>
    );
  };

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Profile" />
        <View style={styles.authContainer}>
          <View style={styles.welcomeSection}>
            <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              Welcome to Community
            </Text>
            <Text style={[styles.welcomeText, { color: colors.secondary }]}>
              Sign in to connect with your community, join events, and manage your profile
            </Text>
            
            <Link href="/login" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.authButton,
                  styles.loginButton,
                  { opacity: pressed ? 0.8 : 1 }
                ]}>
                <Text style={[styles.authButtonText, styles.loginButtonText]}>
                  Log In
                </Text>
              </Pressable>
            </Link>

            <Link href="/sign-up" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.authButtonOutline,
                  { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                ]}>
                <Text style={[styles.authButtonOutlineText, { color: colors.primary }]}>
                  Create Account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Profile"
        rightElement={renderEditButton()}
      />
      <ScrollView style={styles.scrollView}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosContainer}>
              {userProfile?.photos && userProfile.photos.length > 0 ? (
                <>
                  <Image
                    source={{ uri: userProfile.photos[0] }}
                    style={styles.mainPhoto}
                  />
                  {userProfile.photos.length > 1 && (
                    <View style={styles.additionalPhotos}>
                      {userProfile.photos.slice(1, 3).map((photo, index) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.smallPhoto}
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="images-outline" size={32} color={colors.secondary} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.secondary }]}>
                    No photos added
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
          <Text style={[styles.sectionContent, { color: colors.text }]}>
            {userProfile?.full_name || 'Not set'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Email</Text>
          <Text style={[styles.sectionContent, { color: colors.text }]}>
            {session.user.email}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Birthday</Text>
          <Text style={[styles.sectionContent, { color: colors.text }]}>
            {formatDate(userProfile?.birthday)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bio</Text>
          <Text style={[styles.sectionContent, { color: colors.text }]}>
            {userProfile?.bio || 'Not set'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <View style={styles.aboutItem}>
            <Ionicons name="home" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {userProfile?.hometown || 'Not set'}
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="location" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {userProfile?.current_location || 'Not set'}
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="language" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {userProfile?.languages || 'Not set'}
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="heart" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {userProfile?.hobbies || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={[styles.section, styles.logoutSection]}>
          <Pressable
            style={[
              styles.logoutButton,
              { backgroundColor: colors.surface },
              isSigningOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleSignOut}
            disabled={isSigningOut}>
            {isSigningOut ? (
              <ActivityIndicator color={colors.error} style={styles.buttonIcon} />
            ) : (
              <Ionicons name="log-out" size={24} color={colors.error} style={styles.buttonIcon} />
            )}
            <Text style={[styles.logoutButtonText, { color: colors.error }]}>
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
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
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mainPhoto: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  additionalPhotos: {
    gap: 8,
  },
  smallPhoto: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
  },
  logoutSection: {
    borderBottomWidth: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  mobileEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  mobileEditButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButton: {
    backgroundColor: '#000000',
  },
  loginButtonText: {
    color: '#FFFFFF',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonOutline: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  authButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
});