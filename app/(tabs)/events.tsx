import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../../components/PageHeader';
import SegmentedControl from '../../components/SegmentedControl';
import EventCard from '../../components/EventCard';
import Toast from 'react-native-toast-message';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  image_url: string;
  max_attendees: number;
  current_attendees: number;
  host_id: string;
};

export default function EventsScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const segments = ['All', 'Attending', 'Hosting'];
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchEvents = async () => {
      try {
        setError(null);
        let query;

        if (selectedIndex === 1 && session) {
          // Attending events - fetch events through event_attendees
          query = supabase
            .from('events')
            .select(`
              *,
              event_attendees!inner(user_id),
              attendees:event_attendees(*)
            `)
            .eq('event_attendees.user_id', session.user.id);
        } else if (selectedIndex === 2 && session) {
          // Hosting events
          query = supabase
            .from('events')
            .select(`
              *,
              attendees:event_attendees(*)
            `)
            .eq('host_id', session.user.id);
        } else {
          // All events
          query = supabase
            .from('events')
            .select(`
              *,
              attendees:event_attendees(*)
            `);
        }

        // Add ordering
        query = query.order('date', { ascending: true });

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        if (mounted) {
          // Transform data to include attendee count
          const transformedData = data.map(event => ({
            ...event,
            current_attendees: Array.isArray(event.attendees) ? event.attendees.length : 0
          }));

          setEvents(transformedData);
          setError(null);
          setRetryCount(0); // Reset retry count on successful fetch
        }
      } catch (err: any) {
        console.error('Error fetching events:', err);
        
        if (mounted) {
          setError('Failed to load events. Please check your connection and try again.');
          
          // Implement exponential backoff for retries
          if (retryCount < 3) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            retryTimeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, delay);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEvents();

    // Set up real-time subscription for event updates
    const eventsChannel = supabase.channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    // Set up real-time subscription for attendee updates
    const attendeesChannel = supabase.channel('attendees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      eventsChannel.unsubscribe();
      attendeesChannel.unsubscribe();
    };
  }, [selectedIndex, session, retryCount]);

  const handleCreateEvent = () => {
    if (!session) {
      router.push('/sign-in');
      return;
    }
    router.push('/events/create');
  };

  const handleRetry = () => {
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
  };

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading events...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRetry}>
            <Text style={[styles.retryButtonText, { color: colors.background }]}>
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color={colors.secondary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {selectedIndex === 0
              ? 'No events found'
              : selectedIndex === 1
              ? 'You are not attending any events'
              : 'You are not hosting any events'}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
            {selectedIndex === 2
              ? 'Create your first event to get started'
              : 'Check back later for new events'}
          </Text>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateEvent}>
            <Ionicons name="add" size={24} color={colors.background} />
            <Text style={[styles.createButtonText, { color: colors.background }]}>
              Create Event
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            date={formatDate(event.date)}
            imageUrl={event.image_url}
            price="Free"
            attendees={event.current_attendees}
            connections={4}
            description={event.description}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Events"
        rightElement={
          <Pressable
            style={[styles.headerCreateButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateEvent}>
            <Ionicons name="add" size={24} color={colors.background} />
            <Text style={[styles.createButtonText, { color: colors.background }]}>
              Create
            </Text>
          </Pressable>
        }
      />
      <SegmentedControl
        segments={segments}
        selectedIndex={selectedIndex}
        onChange={setSelectedIndex}
      />
      {renderContent()}
      <Toast />
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
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 24,
  },
  headerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});