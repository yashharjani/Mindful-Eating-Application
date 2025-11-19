import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const EditBehaviorsScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [allBehaviors, setAllBehaviors] = useState([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState([]);
  const { currentBehaviors, onBehaviorUpdate } = route.params;

  useEffect(() => {
    const fetchBehaviors = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/behavior/behavior-list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 200) {
          setAllBehaviors(response.data.data);
          // Initialize selected behaviors with current ones
          setSelectedBehaviors(currentBehaviors.map(b => b.behavior_id));
        }
      } catch (error) {
        console.log("Error fetching behaviors:", error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch behaviors',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBehaviors();
  }, []);

  const toggleBehavior = (behaviorId) => {
    setSelectedBehaviors(prev => {
      if (prev.includes(behaviorId)) {
        return prev.filter(id => id !== behaviorId);
      } else {
        if (prev.length < 3) {
          return [...prev, behaviorId];
        } else {
          Toast.show({
            type: 'error',
            text1: 'Limit Reached',
            text2: 'You can select up to 3 behaviors only',
          });
          return prev;
        }
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedBehaviors.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select at least one behavior',
      });
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const payload = {
        behavior_list: selectedBehaviors.map(id => ({
          behavior_id: parseInt(id),
          first_priority: true,
          high_priority: true
        }))
      };

      const response = await axios.post(
        `${BASE_URL}/behavior/submit-behavior`,
        payload,
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
          text1: 'Success',
          text2: 'Behaviors updated successfully',
        });
        onBehaviorUpdate();
        navigation.goBack();
      }
    } catch (error) {
      console.log("Error updating behaviors:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update behaviors',
      });
    } finally {
      setLoading(false);
    }
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select Your Focus Behaviors</Text>
      <Text style={styles.subtitle}>Choose 1-3 behaviors to focus on ({selectedBehaviors.length}/3 selected)</Text>

      {allBehaviors.map(behavior => (
        <TouchableOpacity 
          key={behavior.id} 
          style={styles.behaviorItem}
          onPress={() => toggleBehavior(behavior.id)}
          activeOpacity={0.7}
        >
          <Icon 
            name={selectedBehaviors.includes(behavior.id) ? "check-box" : "check-box-outline-blank"} 
            size={24} 
            color={selectedBehaviors.includes(behavior.id) ? '#3498db' : '#bdc3c7'} 
          />
          <View style={styles.behaviorInfo}>
            <Text style={styles.behaviorTitle}>{behavior.behavior_title}</Text>
            <Text style={styles.behaviorDescription}>{behavior.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (selectedBehaviors.length === 0 || loading) && styles.disabledButton
        ]}
        onPress={handleSubmit}
        disabled={selectedBehaviors.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Save Behaviors</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  behaviorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  behaviorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  behaviorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  behaviorDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    justifyContent: 'center',
    height: 50,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditBehaviorsScreen;