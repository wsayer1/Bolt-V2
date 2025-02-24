import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type User = {
  id: string;
  first_name?: string;
  last_name?: string;
  birthday?: string;
  hometown?: string;
  current_location?: string;
  languages?: string[];
  hobbies?: string[];
  bio?: string;
  photos?: string[];
};

export default function ProfileView() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
  }, [id]);

  async function fetchUser() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    setUser(data);
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
          {user.photos?.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={index === 0 ? styles.mainPhoto : styles.additionalPhoto}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Name</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {user.first_name} {user.last_name}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bio</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoText, { color: colors.text }]}>{user.bio || 'No bio provided'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <View style={styles.aboutItem}>
            <Ionicons name="calendar" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>{user.birthday || 'Not set'}</Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="home" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>{user.hometown || 'Not set'}</Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="location" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>{user.current_location || 'Not set'}</Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="language" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {user.languages?.join(', ') || 'Not set'}
            </Text>
          </View>
          <View style={styles.aboutItem}>
            <Ionicons name="heart" size={20} color={colors.secondary} />
            <Text style={[styles.aboutText, { color: colors.text }]}>
              {user.hobbies?.join(', ') || 'Not set'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
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
  photosContainer: {
    flexDirection: 'row',
  },
  mainPhoto: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  additionalPhoto: {
    width: 96,
    height: 96,
    borderRadius: 8,
    marginRight: 8,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
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
});