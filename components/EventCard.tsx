import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

type EventCardProps = {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  price: string;
  attendees: number;
  connections: number;
  description: string;
};

export default function EventCard({
  id,
  title,
  date,
  imageUrl,
  price,
  attendees,
  connections,
  description,
}: EventCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    router.push(`/events/${id}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={[styles.title, { color: colors.background }]}>{title}</Text>
        <View style={styles.detailsContainer}>
          <View style={styles.details}>
            <Text style={[styles.date, { color: colors.background }]}>{date}</Text>
            <Text style={[styles.price, { color: colors.background }]}>{price}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={[styles.statsText, { color: colors.background }]}>
              {attendees} Going · {connections} Connections
            </Text>
          </View>
          <Text style={[styles.description, { color: colors.background }]} numberOfLines={2}>
            {description}
          </Text>
        </View>
        <View style={styles.hostContainer}>
          <View style={[styles.hostAvatar, { backgroundColor: colors.background }]}>
            <Ionicons name="person" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 16,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
  },
  detailsContainer: {
    gap: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    opacity: 0.9,
  },
  hostContainer: {
    alignItems: 'flex-end',
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});