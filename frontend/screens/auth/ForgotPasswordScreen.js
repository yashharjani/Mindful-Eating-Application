import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Reset Password
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

    if (step === 2) {
      if (!otp.trim()) {
        newErrors.otp = 'OTP is required';
        valid = false;
      }

      if (!newPassword.trim()) {
        newErrors.newPassword = 'New password is required';
        valid = false;
      } else if (newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSendOtp = async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      const response = await axios.post(BASE_URL + '/auth/forget-password', {
        email,
      });

      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: response.data.message,
      });
      setStep(2); // Move to the next step (OTP and new password)
    } catch (error) {
      const errorMessage = error.response?.data?.detail?.message || 'Failed to send OTP';
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateInputs()) return;
    setLoading(true);

    try {
      const response = await axios.post(BASE_URL + '/auth/password-reset', {
        email,
        otp,
        new_password: newPassword,
      });

      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: response.data.message,
      });
      navigation.navigate('Login'); // Navigate back to the login screen
    } catch (error) {
      const errorMessage = error.response?.data?.detail?.message || 'Failed to reset password';
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
        <Text style={styles.title}>Forgot Password</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor="#A9A9A9"
            editable={step === 1} // Disable editing when step === 2
          />
          <View style={styles.progressIndicator} />
        </View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        {step === 2 && (
          <>
            {/* OTP Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                placeholderTextColor="#A9A9A9"
              />
              <View style={styles.progressIndicator} />
            </View>
            {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholderTextColor="#A9A9A9"
              />
              <View style={styles.progressIndicator} />
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </>
        )}

        {/* Send OTP / Reset Password Button */}
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={step === 1 ? handleSendOtp : handleResetPassword}
            >
              <Text style={styles.buttonText}>{step === 1 ? 'Send OTP' : 'Reset Password'}</Text>
            </TouchableOpacity>
            <View style={styles.progressIndicator} />
          </View>
        )}
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
    textAlign: 'center',
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
    elevation: 5, // For Android
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
});

export default ForgotPasswordScreen;