import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  const isFull = event.max_attendees && attendees.length >= event.max_attendees;
  
  // Show max 5 attendees in the preview
  const previewAttendees = attendees.slice(0, 5);
  const hasMoreAttendees = attendees.length > 5;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image_url }} style={styles.image} />
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          {event.host.photos?.[0] && (
            <Image
              source={{ uri: event.host.photos[0] }}
              style={styles.hostAvatar}
            />
          )}
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {formatDate(event.date)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={20} color={colors.text} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Free
              </Text>
            </View>
          </View>
          
          <View style={styles.attendeesSection}>
            <View style={styles.attendeesHeader}>
              <Text style={[styles.attendeesCount, { color: colors.text }]}>
                {attendees.length} Going • 4 Connections
              </Text>
              <Pressable>
                <Text style={[styles.seeAllButton, { color: colors.primary }]}>
                  See All
                </Text>
              </Pressable>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.attendeesList}>
              {previewAttendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeItem}>
                  {attendee.user.photos?.[0] ? (
                    <Image
                      source={{ uri: attendee.user.photos[0] }}
                      style={styles.attendeeAvatar}
                    />
                  ) : (
                    <View style={styles.attendeePlaceholder}>
                      <Ionicons name="person" size={16} color="#666" />
                    </View>
                  )}
                  <Text style={[styles.attendeeName, { color: colors.text }]}>
                    {attendee.user.full_name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.descriptionSection}>
            <Text style={[styles.description, { color: colors.text }]}>
              {event.description}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.rsvpButton,
            { backgroundColor: hasRsvped ? colors.secondary : colors.primary },
            isFull && !hasRsvped && styles.disabledButton
          ]}
          onPress={handleRSVP}
          disabled={isRsvping || (isFull && !hasRsvped)}>
          {isRsvping ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.rsvpButtonText}>
              {hasRsvped ? 'CANCEL' : isFull ? 'EVENT FULL' : 'RSVP'}
            </Text>
          )}
        </Pressable>
      </View>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatar: {
    position: 'absolute',
    bottom: -20,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 8,
  },
  attendeesSection: {
    marginBottom: 24,
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendeesCount: {
    fontSize: 16,
    fontWeight: '500',
  },
  seeAllButton: {
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attendeesList: {
    flexDirection: 'row',
  },
  attendeeItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  attendeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  attendeePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  descriptionSection: {
    paddingTop: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rsvpButton: {
    padding: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  rsvpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});