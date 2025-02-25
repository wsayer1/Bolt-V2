import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type EventCardProps = {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
  price: string;
  attendees: number;
  connections: number;
  description: string;
  hostImageUrl?: string;
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
  hostImageUrl,
}: EventCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    router.push(`/events/${id}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.overlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.7 }}
      >
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.date}>{date}</Text>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.price}>{price}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {attendees} Going • {connections} Connections
            </Text>
          </View>
          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>
        </View>
        <View style={styles.hostContainer}>
          <View style={styles.hostAvatar}>
            {hostImageUrl ? (
              <Image source={{ uri: hostImageUrl }} style={styles.hostImage} />
            ) : (
              <Ionicons name="person" size={16} color="#666" />
            )}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 240,
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
    justifyContent: 'flex-end',
    padding: 16,
  },
  contentContainer: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 13,
    color: 'white',
  },
  bullet: {
    fontSize: 13,
    color: 'white',
    marginHorizontal: 4,
  },
  price: {
    fontSize: 13,
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statsText: {
    fontSize: 13,
    color: 'white',
  },
  description: {
    fontSize: 13,
    color: 'white',
    opacity: 0.9,
    lineHeight: 18,
  },
  hostContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hostImage: {
    width: '100%',
    height: '100%',
  }
});