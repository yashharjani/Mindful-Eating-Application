import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';
import { countries } from '../../utils/countries'; // Make sure to import your countries data

const CountryDropdown = ({ value, onSelect }) => {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchText, setSearchText] = useState('');

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
    onSelect(selectedCountry.label);
    setShowCountryPicker(false);
    setSearchText('');
    setFilteredCountries([]);
  };

  return (
    <View>
      <TouchableOpacity 
        style={styles.countrySelector} 
        onPress={() => setShowCountryPicker(!showCountryPicker)}
      >
        <Text style={value ? styles.selectedValue : styles.placeholderText}>
          {value || "Select a country"}
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
          
          {filteredCountries.length > 0 ? (
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
          ) : (
            <FlatList
              data={countries}
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
    </View>
  );
};

const ProfileEditScreen = ({ navigation, route }) => {
  const { profileData } = route.params;
  const [firstName, setFirstName] = useState(profileData.firstName);
  const [lastName, setLastName] = useState(profileData.lastName);
  const [username, setUsername] = useState(profileData.username);
  const [age, setAge] = useState(profileData.age.toString());
  const [currentGender, setCurrentGender] = useState(profileData.currentGender);
  const [country, setCountry] = useState(profileData.country);
  const [errors, setErrors] = useState({});

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Non-binary', value: 'Non-binary' },
    { label: 'Transgender', value: 'Transgender' },
    { label: 'Prefer not to say', value: 'Prefer not to say' },
  ];

  const validateInputs = () => {
    let valid = true;
    let newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      valid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      valid = false;
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
      valid = false;
    }

    if (!age.trim()) {
      newErrors.age = 'Age is required';
      valid = false;
    } else if (isNaN(age) || parseInt(age) <= 0) {
      newErrors.age = 'Age must be a valid number';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleUpdateProfile = async () => {
    if (!validateInputs()) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `${BASE_URL}/auth/update-profile`,
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          age: parseInt(age),
          current_gender: currentGender,
          country: country.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Great!',
          text2: response.data.message,
        });
        navigation.goBack();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: response.data?.detail || 'Failed to update profile',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: error.response?.data?.detail || 'Failed to update profile',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* First Name */}
        <Text style={styles.label}>First Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor="#A9A9A9"
          />
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        {/* Last Name */}
        <Text style={styles.label}>Last Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor="#A9A9A9"
          />
        </View>
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#A9A9A9"
          />
        </View>
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

        {/* Age */}
        <Text style={styles.label}>Age</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholderTextColor="#A9A9A9"
          />
        </View>
        {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}

        {/* Current Gender */}
        <Text style={styles.label}>Current Gender</Text>
        <View style={styles.inputContainer}>
          <Dropdown
            style={styles.dropdown}
            placeholder="Select Current Gender"
            data={genderOptions}
            value={currentGender}
            onChange={(item) => setCurrentGender(item.value)}
            labelField="label"
            valueField="value"
          />
        </View>

        {/* Country */}
        <Text style={styles.label}>Country</Text>
        <View style={styles.inputContainer}>
          <CountryDropdown 
            value={country} 
            onSelect={setCountry} 
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3498db',
    overflow: 'hidden',
  },
  input: {
    height: 50,
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#000',
  },
  dropdown: {
    height: 50,
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Country dropdown styles
  countrySelector: {
    height: 50,
    backgroundColor: '#ffffff',
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

export default ProfileEditScreen;