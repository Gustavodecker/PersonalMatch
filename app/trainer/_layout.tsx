import { Stack } from 'expo-router';

export default function TrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="agenda-config" />
    </Stack>
  );
}
