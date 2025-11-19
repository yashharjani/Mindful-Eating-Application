import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const ProfileViewScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [currentGender, setCurrentGender] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [behaviors, setBehaviors] = useState([]);
  const [bigFiveTraits, setBigFiveTraits] = useState(null);

  // Fetch profile details
  const fetchProfileDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Fetch basic profile details
        const profileResponse = await axios.get(`${BASE_URL}/auth/profile-details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (profileResponse.status === 200) {
          const data = profileResponse.data.data;
          setEmail(data.email);
          setFirstName(data.first_name);
          setLastName(data.last_name);
          setUsername(data.username);
          setAge(data.age?.toString() || '');
          setCurrentGender(data.current_gender);
          setCountry(data.country);
          setState(data.state);
          setCity(data.city);
        }

         // Fetch user behaviors
         const behaviorResponse = await axios.get(`${BASE_URL}/behavior/check-behavior-submission`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (behaviorResponse.status === 200) {
          // Filter to only show high priority behaviors
          const highPriorityBehaviors = behaviorResponse.data.data.filter(
            behavior => behavior.high_priority
          );

          setBehaviors(highPriorityBehaviors);
        }

        // Fetch Big Five traits
        const bigFiveResponse = await axios.get(`${BASE_URL}/big-five/get-details`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (bigFiveResponse.status === 200) {
          setBigFiveTraits(bigFiveResponse.data.data);
        }

        // Fetch profile picture
        const pictureResponse = await axios.get(`${BASE_URL}/auth/profile-picture`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (pictureResponse.status === 200) {
          setProfilePicture(`data:image/png;base64,${pictureResponse.data.data.profile_picture}`);
        } else if (pictureResponse.status === 404) {
          setProfilePicture(null);
        }
      }
    } catch (error) {
      console.log("Error fetching profile details:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileDetails();
    }, [])
  );

  // Handle profile picture upload
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
        setProfilePicture(`data:image/png;base64,${base64Image}`);
        if (route.params?.onProfilePictureUpdate) {
          route.params.onProfilePictureUpdate(`data:image/png;base64,${base64Image}`);
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

  const handleEditBehaviors = () => {
    navigation.navigate('EditBehaviors', {
      currentBehaviors: behaviors,
      onBehaviorUpdate: fetchProfileDetails // Refresh behaviors after update
    });
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {/* Profile Picture */}
      <View style={styles.profilePictureContainer}>
        {profilePicture && (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        )}
        {profilePicture && ( // Only show the edit profile picture button if profile picture exists
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadProfilePicture}>
            <Icon name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Icon name="email" size={20} color="#3498db" />
          <Text style={styles.detailText}>{email}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="person" size={20} color="#3498db" />
          <Text style={styles.detailText}>{firstName} {lastName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="alternate-email" size={20} color="#3498db" />
          <Text style={styles.detailText}>{username}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="cake" size={20} color="#3498db" />
          <Text style={styles.detailText}>{age} years</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="wc" size={20} color="#3498db" />
          <Text style={styles.detailText}>{currentGender}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="location-on" size={20} color="#3498db" />
          <Text style={styles.detailText}>
            {[city, state, country].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>

      {/* Big Five Traits Section */}
      {bigFiveTraits && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Personality Traits</Text>
          <Text style={styles.subtitle}>
      Your dominant trait: {bigFiveTraits.max_value.charAt(0).toUpperCase() + bigFiveTraits.max_value.slice(1)}
    </Text>
          
          <View style={styles.traitsContainer}>
            {Object.entries(bigFiveTraits.big_five_data).map(([trait, value]) => (
              <View key={trait} style={styles.traitItem}>
                <Text style={styles.traitName}>{trait.charAt(0).toUpperCase() + trait.slice(1)}</Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { 
                        width: `${value * 100}%`,
                        backgroundColor: trait === bigFiveTraits.max_value ? '#3498db' : '#95a5a6'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.traitValue}>{(value * 100).toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Behavior Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Focus Behaviors</Text>
          <TouchableOpacity onPress={handleEditBehaviors}>
            <Icon name="edit" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>
        
        {behaviors.length > 0 ? (
          behaviors.map((behavior) => (
            <View key={behavior.behavior_id} style={styles.behaviorItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.behaviorText}>{behavior.behavior_title}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noBehaviorsText}>No focus behaviors selected</Text>
        )}
      </View>

      {/* Edit Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate('ProfileEdit', {
            profileData: {
              email,
              firstName,
              lastName,
              username,
              age,
              currentGender,
              country,
              state,
              city,
              profilePicture,
            },
          })
        }
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  behaviorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  behaviorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  noBehaviorsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingVertical: 10,
  },
  editButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
  uploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498db',
    borderRadius: 20,
    padding: 8,
  },
  traitsContainer: {
    marginTop: 10,
  },
  traitItem: {
    marginBottom: 12,
  },
  traitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  traitValue: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 15,
    fontWeight: '500',
  },
});

export default ProfileViewScreen;