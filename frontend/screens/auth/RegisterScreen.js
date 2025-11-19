import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation function - unchanged
  const validateInputs = () => {
    let valid = true;
    let newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
      valid = false;
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm password is required';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      valid = false;
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  // Handle register function - unchanged
  const handleRegister = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const response = await axios.post(BASE_URL + '/auth/register', {
        email: email.trim(),
        password: password.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: response.data.message,
      });
      navigation.navigate('Login');
    } catch (error) {
      const errorMessage = error.response?.data?.detail?.message || 'Registration failed';
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create an Account</Text>
        
        {/* Email Input with container and progress bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor="#A9A9A9"
          />
          <View style={styles.progressIndicator} />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        
        {/* Password Input with container and progress bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            // secureTextEntry={!showPassword}
            placeholderTextColor="#A9A9A9"
          />
            {/* <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity> */}
          <View style={styles.progressIndicator} />
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        
        {/* Confirm Password Input with container and progress bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            // secureTextEntry={!showConfirmPassword}
            placeholderTextColor="#A9A9A9"
          />
          {/* <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity> */}
          <View style={styles.progressIndicator} />
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        
        {/* First Name Input with container and progress bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor="#A9A9A9"
          />
          <View style={styles.progressIndicator} />
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        
        {/* Last Name Input with container and progress bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor="#A9A9A9"
          />
          <View style={styles.progressIndicator} />
        </View>
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        
        {/* Registration Button */}
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
            <View style={styles.progressIndicator} />
          </View>
        )}
        
        {/* Separator */}
        <View style={styles.separatorContainer}>
          <Text style={styles.separatorText}>Already have an account?</Text>
        </View>
        
        {/* Login Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <View style={styles.progressIndicator} />
        </View>
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
    justifyContent: 'center',
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
  separatorContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  separatorText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: 'bold',
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -15,
    marginBottom: 15,
    textAlign: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
});

export default RegisterScreen;