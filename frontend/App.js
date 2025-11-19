import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';  // Fixed import
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import RegisterScreen from './screens/auth/RegisterScreen';
import LoginScreen from './screens/auth/LoginScreen';
import SurveyScreen from './screens/initial/SurveyScreen';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import ProfileEditScreen from './screens/profile/ProfileEditScreen';
import ProfileBehaviorUpdateScreen from './screens/profile/ProfileBehaviorUpdateScreen';
import UserProfileSubmissionScreen from './screens/initial/UserProfileSubmissionScreen';
import ForgotPassword from './screens/auth/ForgotPasswordScreen';
import Chat from './screens/dashboard/ChatScreen';
import Toast from 'react-native-toast-message';
import { toastConfig } from './utils/toastConfig';

const Stack = createNativeStackNavigator();

export default function App() {

  useEffect(() => {
    NetInfo.fetch().then(state => {
      if (!state.isConnected) {
        alert("No internet connection. Please check your network settings.");
      }
    });
  }, []);

  // return (
  //   <>
  //     <NavigationContainer>
  //       <Stack.Navigator initialRouteName="Login">
  //         <Stack.Screen name="Register" component={RegisterScreen} />
  //         <Stack.Screen name="Login" component={LoginScreen} />
  //         <Stack.Screen name="UserProfileSubmission" component={UserProfileSubmissionScreen} />
  //         <Stack.Screen name="SurveyScreen" component={SurveyScreen} />
  //         <Stack.Screen name="Dashboard" component={DashboardScreen} />
  //         <Stack.Screen name="Profile" component={ProfileScreen} />
  //         <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
  //         <Stack.Screen name="Chat" component={Chat} />
  //         <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
  //         <Stack.Screen name="EditBehaviors" component={ProfileBehaviorUpdateScreen} />
  //       </Stack.Navigator>
  //     </NavigationContainer>
  //     <Toast config={toastConfig} />
  //   </>
  // );
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, paddingBottom: 1 }} edges={['bottom']}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="UserProfileSubmission" component={UserProfileSubmissionScreen} />
            <Stack.Screen name="SurveyScreen" component={SurveyScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="EditBehaviors" component={ProfileBehaviorUpdateScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>

      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
