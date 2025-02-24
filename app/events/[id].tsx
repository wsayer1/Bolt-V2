import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image_url: string;
  max_attendees: number;
  current_attendees: number;
  host_id: string;
  host: {
    full_name: string;
    photos: string[];
  };
};

type Attendee = {
  id: string;
  user: {
    full_name: string;
    photos: string[];
  };
};

export default function EventDetails() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRsvping, setIsRsvping] = useState(false);
  const [hasRsvped, setHasRsvped] = useState(false);

  useEffect(() => {
    fetchEventDetails();

    // Set up real-time subscription for event updates
    const channel = supabase.channel(`event-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            Toast.show({
              type: 'info',
              text1: 'Event Deleted',
              text2: 'This event has been deleted',
            });
            router.replace('/events');
            return;
          }

          // Update event data immediately
          setEvent(currentEvent => ({
            ...currentEvent!,
            ...payload.new,
          }));
        }
      )
      .subscribe();

    // Set up real-time subscription for attendee updates
    const attendeesChannel = supabase.channel(`event-attendees-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${id}`,
        },
        () => {
          // Refetch attendees and RSVP status when any change occurs
          fetchAttendees();
          checkRsvpStatus();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      attendeesChannel.unsubscribe();
    };
  }, [id]);

  const checkRsvpStatus = async () => {
    if (!session?.user.id) return;

    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error checking RSVP status:', error);
        return;
      }

      setHasRsvped(data && data.length > 0);
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch event with host details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          host:host_id(full_name, photos)
        `)
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
      
      await Promise.all([
        fetchAttendees(),
        checkRsvpStatus(),
      ]);
    } catch (error) {
      console.error('Error fetching event details:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load event details',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select(`
          id,
          user:user_id(full_name, photos)
        `)
        .eq('event_id', id);

      if (attendeesError) throw attendeesError;
      setAttendees(attendeesData || []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleRSVP = async () => {
    if (!session) {
      router.push('/sign-in');
      return;
    }

    try {
      setIsRsvping(true);

      if (hasRsvped) {
        // Cancel RSVP
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', id)
          .eq('user_id', session.user.id);

        if (error) throw error;

        setHasRsvped(false);
        Toast.show({
          type: 'success',
          text1: 'RSVP Cancelled',
          text2: 'You have cancelled your RSVP',
        });
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('event_attendees')
          .insert({
            event_id: id,
            user_id: session.user.id,
          });

        if (error) {
          if (error.code === '23514') {
            Toast.show({
              type: 'error',
              text1: 'Event Full',
              text2: 'This event has reached its maximum capacity',
            });
            return;
          }
          throw error;
        }

        setHasRsvped(true);
        Toast.show({
          type: 'success',
          text1: 'RSVP Confirmed',
          text2: 'You are now attending this event',
        });
      }
    } catch (error) {
      console.error('Error handling RSVP:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to process your RSVP',
      });
    } finally {
      setIsRsvping(false);
    }
  };

  const handleEditEvent = () => {
    router.push(`/events/edit/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Event not found</Text>
      </View>
    );
  }

  const isHost = session?.user.id === event.host_id;
  const isFull = event.max_attendees && attendees.length >= event.max_attendees;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <Image source={{ uri: event.image_url }} style={styles.image} />
        
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.background }]}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.dateLocation}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={20} color={colors.secondary} />
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {formatDate(event.date)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={20} color={colors.secondary} />
                <Text style={[styles.metaText, { color: colors.text }]}>
                  {event.location}
                </Text>
              </View>
            </View>

            <View style={styles.attendeeInfo}>
              <Text style={[styles.attendeeCount, { color: colors.text }]}>
                {attendees.length} Going
              </Text>
              {event.max_attendees && (
                <Text style={[styles.maxAttendees, { color: colors.secondary }]}>
                  · {event.max_attendees - attendees.length} spots left
                </Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.attendeeList}>
              {attendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeItem}>
                  {attendee.user.photos?.[0] ? (
                    <Image
                      source={{ uri: attendee.user.photos[0] }}
                      style={styles.attendeePhoto}
                    />
                  ) : (
                    <View style={[styles.attendeePlaceholder, { backgroundColor: colors.surface }]}>
                      <Ionicons name="person" size={16} color={colors.secondary} />
                    </View>
                  )}
                  <Text style={[styles.attendeeName, { color: colors.text }]}>
                    {attendee.user.full_name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.hostSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Host</Text>
            <View style={styles.hostInfo}>
              {event.host.photos?.[0] ? (
                <Image
                  source={{ uri: event.host.photos[0] }}
                  style={styles.hostPhoto}
                />
              ) : (
                <View style={[styles.hostPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="person" size={24} color={colors.secondary} />
                </View>
              )}
              <Text style={[styles.hostName, { color: colors.text }]}>
                {event.host.full_name}
              </Text>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.description, { color: colors.text }]}>
              {event.description}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        {isHost ? (
          <Pressable
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={handleEditEvent}>
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Edit Event
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.rsvpButton,
              { backgroundColor: hasRsvped ? colors.surface : colors.primary },
              (isFull && !hasRsvped) && styles.rsvpButtonDisabled,
            ]}
            onPress={handleRSVP}
            disabled={isRsvping || (isFull && !hasRsvped)}>
            {isRsvping ? (
              <ActivityIndicator color={hasRsvped ? colors.primary : colors.background} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: hasRsvped ? colors.primary : colors.background },
                ]}>
                {hasRsvped ? 'Cancel RSVP' : isFull ? 'Event Full' : 'RSVP'}
              </Text>
            )}
          </Pressable>
        )}
      </View>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  metaInfo: {
    marginBottom: 24,
  },
  dateLocation: {
    gap: 12,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 16,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendeeCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  maxAttendees: {
    fontSize: 16,
    marginLeft: 4,
  },
  attendeeList: {
    flexDirection: 'row',
  },
  attendeeItem: {
    marginRight: 20,
    alignItems: 'center',
  },
  attendeePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  attendeePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attendeeName: {
    fontSize: 12,
    textAlign: 'center',
  },
  hostSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  hostPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostName: {
    fontSize: 16,
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  rsvpButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});