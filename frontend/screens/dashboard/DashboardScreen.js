import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  BackHandler,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import HomeScreen from './HomeScreen';
import FoodUpdateScreen from '../foodupdate/FoodUpdateScreen';
import ProfileScreen from '../profile/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const DashboardScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userUserName, setUserUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const isFocused = useIsFocused();

  // Set up navigation options to show confirmation dialog on back button press
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            confirmLogout();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
      ),
      headerBackVisible: false, // Hide the default back button
      gestureEnabled: false, // Disable swipe-back gesture
    });
  }, [navigation]);

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        confirmLogout();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription?.remove?.();
    }, [navigation])
  );

  // Confirmation dialog for logout
  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout",
          onPress: () => handleLogout()
        }
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // const fetchUserData = async () => {
  //   try {
  //     const token = await AsyncStorage.getItem('token');
  //     if (token) {
  //       const user = JSON.parse(atob(token.split('.')[1]));
  //       setUserName(`${user.first_name} ${user.last_name}`);
  //       setUserUserName(`${user.username}`);
  //       const response = await axios.get(`${BASE_URL}/auth/profile-picture`, {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });
  //       if (response.status === 200) {
  //         setProfilePicture(`data:image/png;base64,${response.data.data.profile_picture}`);
  //       } else {
  //         setProfilePicture(null);
  //       }
  //     }
  //   } catch (error) {
  //     console.log("Error fetching user data:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const user = JSON.parse(atob(token.split('.')[1]));
        setUserName(`${user.first_name} ${user.last_name}`);
        setUserUserName(`${user.username}`);

        try {
          const response = await axios.get(`${BASE_URL}/auth/profile-picture`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.status === 200 && response.data?.data?.profile_picture) {
            setProfilePicture(`data:image/png;base64,${response.data.data.profile_picture}`);
          } else {
            setProfilePicture(null);
          }
        } catch (err) {
          // Handle 404 (no profile picture uploaded)
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setProfilePicture(null); // Use default or blank avatar silently
          } else {
            console.log('Error fetching profile picture:', err);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpdate = (newProfilePicture) => {
    setProfilePicture(newProfilePicture);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('token');
      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: 'You have been successfully logged out.',
      });
      navigation.replace('Login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to log out. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: 'Please allow access to the gallery to upload a profile picture.',
        });
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true,
      });
      
      if (result.canceled) return;
      
      const base64Image = result.assets[0].base64;
      if (!base64Image) {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: 'Failed to get image data.',
        });
        return;
      }
      
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${BASE_URL}/auth/upload-profile-picture`,
        { base64_file: base64Image },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Great!',
          text2: 'Profile picture uploaded successfully!',
        });
        
        const newProfilePicture = `data:image/png;base64,${base64Image}`;
        setProfilePicture(newProfilePicture);
        
        if (route.params?.onProfilePictureUpdate) {
          route.params.onProfilePictureUpdate(newProfilePicture);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: `Upload failed: ${response.data?.detail || 'Unknown error'}`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error.response?.data || error);
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to upload profile picture: ' + (error.response?.data?.detail || error.message),
      });
    }
  };

  const toggleDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        const screenWidth = Dimensions.get('window').width;
        const dropdownWidth = 120;
        const leftPosition = pageX - dropdownWidth + 30;
        setDropdownPosition({ top: pageY + height, left: leftPosition });
      });
    }
    setDropdownVisible(!dropdownVisible);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    // <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.userName}>{userUserName}</Text>
        <View style={styles.profileSection}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadProfilePicture}>
              <Text style={styles.uploadText}>Upload Profile Image</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            ref={dropdownRef}
            onPress={toggleDropdown}
            style={styles.dropdownIcon}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Dropdown Menu */}
      {dropdownVisible && (
        <View
          style={[
            styles.dropdownMenu,
            { top: dropdownPosition.top, left: dropdownPosition.left },
          ]}
        >
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setDropdownVisible(false);
              confirmLogout();
            }}
          >
            <Text style={styles.dropdownText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Bottom Tab Navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarShowLabel: true,
          tabBarStyle: { height: 60 },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          initialParams={{ userName, profilePicture, handleUploadProfilePicture, handleLogout: confirmLogout }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="FoodUpdate"
          component={FoodUpdateScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        >
          {() => (
            <ProfileScreen
              navigation={navigation}
              route={{
                ...route,
                params: {
                  ...route.params,
                  onProfilePictureUpdate: handleProfilePictureUpdate
                }
              }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
      
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('Chat')}
      >
        <Ionicons name="chatbubble" size={24} color="#fff" />
      </TouchableOpacity>
    {/* </View> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    height: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  uploadButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 5,
    padding: 10,
    elevation: 5,
    zIndex: 1000,
    width: 120,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dropdownText: {
    fontSize: 16,
    color: '#3498db',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#3498db',
    marginTop: 10,
  },
  chatButton: {
    position: 'absolute',
    bottom: 50,
    right: 25,
    backgroundColor: '#3498db',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default DashboardScreen;