import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import PageHeader from '../../components/PageHeader';
import SegmentedControl from '../../components/SegmentedControl';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  photos: string[];
  hometown: string;
  current_location: string;
  first_name: string;
  last_name: string;
  full_name: string;
};

const COMMUNITY_TAB_PREFERENCE_KEY = '@community_tab_preference';

export default function CommunityScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(1); // Default to Members (index 1)
  const segments = ['Updates', 'Members'];
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved tab preference
  useEffect(() => {
    loadTabPreference();
  }, []);

  // Save tab preference when it changes
  useEffect(() => {
    saveTabPreference(selectedIndex);
  }, [selectedIndex]);

  const loadTabPreference = async () => {
    try {
      const savedIndex = await AsyncStorage.getItem(COMMUNITY_TAB_PREFERENCE_KEY);
      if (savedIndex !== null) {
        setSelectedIndex(parseInt(savedIndex));
      }
    } catch (error) {
      console.error('Error loading tab preference:', error);
    }
  };

  const saveTabPreference = async (index: number) => {
    try {
      await AsyncStorage.setItem(COMMUNITY_TAB_PREFERENCE_KEY, index.toString());
    } catch (error) {
      console.error('Error saving tab preference:', error);
    }
  };

  useEffect(() => {
    if (selectedIndex === 1) {
      fetchUsers();
    }
  }, [selectedIndex]);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Filter out the current user
      const filteredUsers = data?.filter(user => user.id !== session?.user.id) || [];
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleMemberPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const renderContent = () => {
    if (selectedIndex === 1) {
      if (isLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondary }]}>
              Loading members...
            </Text>
          </View>
        );
      }

      if (users.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="people-outline" size={48} color={colors.secondary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No Members Found
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
              Be the first to join the community!
            </Text>
          </View>
        );
      }

      return (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {users.map((user) => (
            <Pressable 
              key={user.id} 
              style={[styles.memberCard, { borderBottomColor: colors.border }]}
              onPress={() => handleMemberPress(user.id)}>
              {user.photos && user.photos.length > 0 ? (
                <Image
                  source={{ uri: user.photos[0] }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="person" size={24} color={colors.secondary} />
                </View>
              )}
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {user.full_name}
                </Text>
                <Text style={[styles.memberLocation, { color: colors.secondary }]}>
                  {user.current_location || user.hometown || 'No location set'}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="newspaper-outline" size={48} color={colors.secondary} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          Coming Soon
        </Text>
        <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
          Community updates and announcements will be available here soon.
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Community" />
      <SegmentedControl
        segments={segments}
        selectedIndex={selectedIndex}
        onChange={setSelectedIndex}
      />
      {renderContent()}
    </View>
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
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
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
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});