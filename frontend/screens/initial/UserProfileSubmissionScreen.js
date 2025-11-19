import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  FlatList, // Changed from ScrollView to FlatList
  KeyboardAvoidingView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNPickerSelect from 'react-native-picker-select';
import { countries } from '../../utils/countries';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const UserProfileSubmissionScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [genderOfBirth, setGenderOfBirth] = useState('');
  const [currentGender, setCurrentGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [lifestyleType, setLifestyleType] = useState('');
  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dietaryInfluence, setDietaryInfluence] = useState('');
  const [otherDietaryInfluence, setOtherDietaryInfluence] = useState('');
  const [showOtherDietaryInput, setShowOtherDietaryInput] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filter countries based on search text
  const filterCountries = (text) => {
    setSearchText(text);
    if (text) {
      const filtered = countries.filter(
        item => item.label.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries([]);
    }
  };
  
  const selectCountry = (selectedCountry) => {
    setCountry(selectedCountry.label);
    setShowCountryPicker(false);
    setSearchText('');
    setFilteredCountries([]);
  };
  
  const checkUserStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
        return;
      }
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = profileResponse.data.data;
      setUserProfile(user);
      if (user.profile_submission) {
        const surveyResponse = await axios.get(`${BASE_URL}/question/check-submission`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!surveyResponse.data.data.submitted) {
          navigation.replace('SurveyScreen');
        } else {
          navigation.replace('Dashboard');
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch profile';
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: errorMessage,
      });
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  }, [navigation]);
  
  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);
  
  const handleUpdateProfile = async () => {
    // Check if all required fields are filled
    if (!username || !age || !genderOfBirth || !currentGender || !occupation || !lifestyleType || !country || !dietaryInfluence) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please fill all required fields',
      });
      return;
    }
    
    // Validate age
    const ageNumber = parseInt(age, 10);
    // Check if age is a valid integer and contains only digits
    if (isNaN(ageNumber)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Age',
        text2: 'Age must be a number.',
      });
      return;
    }
    
    // Check if the input contains only digits
    if (!/^\d+$/.test(age)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Age',
        text2: 'Age must contain only numbers (e.g., 22).',
      });
      return;
    }
    
    // Check if age is within a reasonable range
    if (ageNumber < 1 || ageNumber > 120) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Age',
        text2: 'Age must be between 1 and 120.',
      });
      return;
    }
    
    // Check if "Other" dietary influence is specified
    if (dietaryInfluence === 'Other' && !otherDietaryInfluence.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please specify your dietary influence',
      });
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        username,
        age: ageNumber, // Use the validated age number
        gender_of_birth: genderOfBirth,
        current_gender: currentGender,
        occupation,
        lifestyle_type: lifestyleType,
        country,
        cultural_religious_dietary_influence:
          dietaryInfluence === 'Other' ? otherDietaryInfluence : dietaryInfluence,
      };
      
      await axios.put(`${BASE_URL}/auth/update-profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      navigation.replace('SurveyScreen');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Update failed';
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: errorMessage,
      });
    }
  };
  
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };
  
  if (loading) {
    return <ActivityIndicator size="large" color="#3498db" style={styles.loading} />;
  }
  
  // Create form items array for FlatList
  const formItems = [
    // Title
    { id: 'title', type: 'title', content: 'Complete Your Profile' },
    
    // Username
    { id: 'username', type: 'input', label: 'Username', value: username, setter: setUsername, placeholder: 'Enter your username' },
    
    // Age
    { id: 'age', type: 'input', label: 'Age', value: age, setter: setAge, placeholder: 'Enter your age', keyboardType: 'numeric' },
    
    // Gender of Birth
    { id: 'genderOfBirth', type: 'picker', label: 'Gender of Birth', value: genderOfBirth, setter: setGenderOfBirth, 
      items: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Prefer not to say', value: 'Prefer not to say' },
      ],
      placeholder: 'Select Gender of Birth'
    },
    
    // Current Gender
    { id: 'currentGender', type: 'picker', label: 'Current Gender', value: currentGender, setter: setCurrentGender,
      items: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Non-binary', value: 'Non-binary' },
        { label: 'Transgender', value: 'Transgender' },
        { label: 'Prefer not to say', value: 'Prefer not to say' },
      ],
      placeholder: 'Select Current Gender'
    },
    
    // Occupation
    { id: 'occupation', type: 'input', label: 'Occupation', value: occupation, setter: setOccupation, placeholder: 'Enter your occupation' },
    
    // Lifestyle Type
    { id: 'lifestyleType', type: 'picker', label: 'Lifestyle Type', value: lifestyleType, setter: setLifestyleType,
      items: [
        { label: 'Sedentary', value: 'Sedentary' },
        { label: 'Active', value: 'Active' },
        { label: 'Irregular work hours', value: 'Irregular work hours' },
      ],
      placeholder: 'Select Lifestyle Type'
    },
    
    // Country
    { id: 'country', type: 'country', label: 'Country', value: country },
    
    // Dietary Influence
    { id: 'dietaryInfluence', type: 'picker', label: 'Dietary Influence', value: dietaryInfluence, 
      setter: (value) => {
        setDietaryInfluence(value);
        setShowOtherDietaryInput(value === 'Other');
      },
      items: [
        { label: 'Halal', value: 'Halal' },
        { label: 'Kosher', value: 'Kosher' },
        { label: 'Vegetarian', value: 'Vegetarian' },
        { label: 'Vegan', value: 'Vegan' },
        { label: 'None', value: 'None' },
        { label: 'Other', value: 'Other' },
      ],
      placeholder: 'Select Dietary Influence'
    },
    
    // Other Dietary Influence (conditional)
    ...(showOtherDietaryInput ? [{ 
      id: 'otherDietaryInfluence', 
      type: 'input', 
      label: 'Other Dietary Influence', 
      value: otherDietaryInfluence, 
      setter: setOtherDietaryInfluence, 
      placeholder: 'Specify your dietary influence' 
    }] : []),
    
    // Submit Button
    { id: 'submitButton', type: 'button', label: 'Save', onPress: handleUpdateProfile },
  ];
  
  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'title':
        return <Text style={styles.title}>{item.content}</Text>;
        
      case 'input':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={item.value}
              onChangeText={item.setter}
              placeholder={item.placeholder}
              placeholderTextColor="#A9A9A9"
              keyboardType={item.keyboardType || 'default'}
            />
            <View style={styles.progressIndicator} />
          </View>
        );
        
      case 'picker':
        return (
          <View style={styles.inputContainer}>
            <RNPickerSelect
              onValueChange={item.setter}
              items={item.items}
              style={pickerSelectStyles}
              placeholder={{ label: item.placeholder, value: null }}
              value={item.value}
            />
            <View style={styles.progressIndicator} />
          </View>
        );
        
      case 'country':
        return (
          <View style={styles.inputContainer}>
            {/* Custom Country Picker */}
            <TouchableOpacity 
              style={styles.countrySelector} 
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={country ? styles.selectedValue : styles.placeholderText}>
                {country || "Select a country"}
              </Text>
            </TouchableOpacity>
            
            {showCountryPicker && (
              <View style={styles.countryPickerContainer}>
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={filterCountries}
                  placeholder="Search countries..."
                  placeholderTextColor="#A9A9A9"
                />
                
                {filteredCountries.length > 0 && (
                  <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item: countryItem }) => (
                      <TouchableOpacity
                        style={styles.countryItem}
                        onPress={() => selectCountry(countryItem)}
                      >
                        <Text style={styles.countryItemText}>{countryItem.label}</Text>
                      </TouchableOpacity>
                    )}
                    style={styles.countriesList}
                    nestedScrollEnabled={true}
                  />
                )}
              </View>
            )}
            <View style={styles.progressIndicator} />
          </View>
        );
        
      case 'button':
        return (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={item.onPress}>
              <Text style={styles.buttonText}>{item.label}</Text>
            </TouchableOpacity>
            <View style={styles.progressIndicator} />
          </View>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        data={formItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContainer: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    overflow: 'hidden',
  },
  input: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    textAlign: 'left',
    fontSize: 16,
    color: '#000',
  },
  progressIndicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '25%',
    height: 5,
    backgroundColor: '#3498db',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  buttonContainer: {
    position: 'relative',
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countrySelector: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  selectedValue: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    fontSize: 16,
    color: '#A9A9A9',
  },
  countryPickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: 250,
  },
  searchInput: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  countriesList: {
    maxHeight: 200,
  },
  countryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countryItemText: {
    fontSize: 16,
    color: '#333',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    color: '#000',
  },
  inputAndroid: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    color: '#000',
  },
  placeholder: {
    color: '#A9A9A9',
  },
});

export default UserProfileSubmissionScreen;