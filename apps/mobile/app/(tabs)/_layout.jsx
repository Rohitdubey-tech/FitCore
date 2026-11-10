import { Ionicons } from '@expo/vector-icons';
import { FITCORE_THEME } from '@fitcore/shared-types';
import { Tabs } from 'expo-router';
import React from 'react';
const TabIcon = Ionicons;
export default function TabsLayout() {
    return (<Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: {
                backgroundColor: FITCORE_THEME.cardBackground,
                borderTopColor: FITCORE_THEME.border,
                height: 64,
                paddingBottom: 8,
            },
            tabBarActiveTintColor: FITCORE_THEME.primaryAccent,
            tabBarInactiveTintColor: FITCORE_THEME.secondaryText,
        }}>
      <Tabs.Screen name="home" options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size}/>,
        }}/>
      <Tabs.Screen name="workouts" options={{
            title: 'Workouts',
            tabBarIcon: ({ color, size }) => <TabIcon name="barbell-outline" color={color} size={size}/>,
        }}/>
      <Tabs.Screen name="nutrition" options={{
            title: 'Nutrition',
            tabBarIcon: ({ color, size }) => <TabIcon name="nutrition-outline" color={color} size={size}/>,
        }}/>
      <Tabs.Screen name="assistant" options={{
            title: 'AI Coach',
            tabBarIcon: ({ color, size }) => <TabIcon name="sparkles-outline" color={color} size={size}/>,
        }}/>
      <Tabs.Screen name="progress" options={{
            title: 'Progress',
            tabBarIcon: ({ color, size }) => <TabIcon name="trending-up-outline" color={color} size={size}/>,
        }}/>
      <Tabs.Screen name="profile" options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size}/>,
        }}/>
    </Tabs>);
}
