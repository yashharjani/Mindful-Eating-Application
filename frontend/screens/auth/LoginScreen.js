import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

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

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    setLoading(true);
  
    try {
      const response = await axios.post(BASE_URL + '/auth/login', {
        email,
        password,
      });
  
      await AsyncStorage.setItem('token', response.data.data.access_token);
      navigation.navigate('UserProfileSubmission');
    } catch (error) {
      let errorMessage = 'Login failed';
      
      // Check if the error is due to no network or timeout
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your network connection.';
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network Error: Unable to reach the backend. Please check your connection.';
      } else if (error.response) {
        // Server responded but has an error
        errorMessage = error.response?.data?.detail?.message || 'Server error occurred.';
      }
  
      // Display the error message to the user
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
        <Text style={styles.title}>Login</Text>

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
            // secureTextEntry
            secureTextEntry={!showPassword}
            placeholderTextColor="#A9A9A9"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
          <View style={styles.progressIndicator} />
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Login Button */}
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            <View style={styles.progressIndicator} />
          </View>
        )}

        {/* Register Link */}
        <View style={styles.separatorContainer}>
          <Text style={styles.separatorText}>Don't have an account?</Text>
        </View>

        {/* Register Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <View style={styles.progressIndicator} />
        </View>

        <View style={styles.separatorContainer}>
          <Text style={styles.separatorText}>Forgot your password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.hyperlinkText}>Reset Password</Text>
          </TouchableOpacity>
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
  hyperlinkText: {
    color: '#3498db',
    textDecorationLine: 'underline', 
    fontWeight: 'bold', 
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
  },

});

export default LoginScreen;