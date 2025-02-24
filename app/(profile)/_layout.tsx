import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}>
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'card',
          headerTitle: 'Profile',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          presentation: 'card',
          headerTitle: 'Edit Profile',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}