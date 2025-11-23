import React, { useState, useEffect } from 'react';
import { ScrollView } from "react-native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../utils/config';
import Toast from 'react-native-toast-message';

const FoodUpdateScreen = () => {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [foodUpdates, setFoodUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [foodDetailsModalVisible, setFoodDetailsModalVisible] = useState(false);
  const [selectedFoodUpdateDetails, setSelectedFoodUpdateDetails] = useState(null);

  // Fetch user's food updates on component mount
  useEffect(() => {
    fetchFoodUpdates();
  }, []);

  // Fetch user's food updates
  const fetchFoodUpdates = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/food-update/user-food-updates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        setFoodUpdates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching food updates:', error);
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to fetch food updates.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please allow access to the gallery to upload images.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
      allowsMultipleSelection: true, // Allow multiple images
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.base64);
      setImages((prevImages) => [...prevImages, ...newImages]);
    }
  };

  // Handle food update submission
  const handleSubmit = async () => {
    if (!description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please enter a description.',
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${BASE_URL}/food-update/food-update`,
        {
          description: description.trim(),
          images: images.map((base64) => ({ base64_file: base64 })),
        },
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
          text2: 'Food update posted successfully!',
        });
        setDescription('');
        setImages([]);
        setModalVisible(false);
        fetchFoodUpdates(); // Refresh the list
      }
    } catch (error) {
      console.error('Error posting food update:', error);
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to post food update.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Render each food update item
  const renderFoodUpdate = ({ item }) => (
    // <View style={styles.foodUpdateItem}>
    <TouchableOpacity
      style={styles.foodUpdateItem}
      onPress={() => fetchFoodUpdateDetails(item.id)}
    >
      {item.analysis && (
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: item.analysis.is_healthy ? "green" : "red",
            position: "absolute",
            top: 10,
            right: 10,
          }}
        />
      )}

      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
      <View style={styles.imageContainer}>
        {item.images.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setSelectedImage(image);
              setImageModalVisible(true);
            }}
          >
            <Image source={{ uri: image }} style={styles.image} />
          </TouchableOpacity>
        ))}
      </View>
    {/* </View> */}
    </TouchableOpacity>
  );

  const fetchFoodUpdateDetails = async (foodUpdateId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/food-update/${foodUpdateId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.data) {
        setSelectedFoodUpdateDetails(response.data.data);
        setFoodDetailsModalVisible(true);
      }
    } catch (err) {
      console.error("Error fetching food update details:", err);
      Toast.show({
        type: "error",
        text1: "Something Went Wrong!",
        text2: "Unable to load food details.",
      });
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <View style={styles.container}>
      {/* Add Food Update Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Add Food Update</Text>
      </TouchableOpacity>

      {/* Food Updates List */}
      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <FlatList
          data={foodUpdates}
          renderItem={renderFoodUpdate}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Food Update Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Food Update</Text>

            {/* Description Input */}
            <TextInput
              style={styles.input}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#888"
            />

            {/* Image Upload */}
            <TouchableOpacity style={styles.uploadButton} onPress={handleImageUpload}>
              <Text style={styles.uploadButtonText}>📷 Upload Images</Text>
            </TouchableOpacity>

            {/* Display Selected Images */}
            {/* <View style={styles.selectedImagesContainer}>
              {images.map((image, index) => (
                <Image key={index} source={{ uri: `data:image/png;base64,${image}` }} style={styles.selectedImage} />
              ))}
            </View> */}

            <View style={styles.selectedImagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: `data:image/png;base64,${image}` }}
                    style={styles.selectedImage}
                  />

                  {/* Delete (X) button */}
                  <TouchableOpacity
                    style={styles.deleteIconContainer}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Submit and Cancel Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                <Text style={styles.submitButtonText}>{loading ? 'Posting...' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Popup Modal */}
      <Modal visible={imageModalVisible} transparent={true} animationType="fade">
        <View style={styles.imagePopupContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>
    

    {/* FOOD DETAILS + AI ANALYSIS MODAL */}
      <Modal
        visible={foodDetailsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFoodDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dashboardModalContainer}> 
            <ScrollView showsVerticalScrollIndicator={false}>

              {selectedFoodUpdateDetails && (
                <>
                  {/* Title */}
                  <Text style={styles.modalTitle}>Food Journey Details</Text>

                  {/* Description */}
                  <Text style={styles.modalDescription}>
                    {selectedFoodUpdateDetails.description}
                  </Text>

                  {/* Created At */}
                  <Text style={styles.createdAtText}>
                    Date: {new Date(selectedFoodUpdateDetails.created_at).toLocaleString()}
                  </Text>

                  {/* Images */}
                  <FlatList
                    data={selectedFoodUpdateDetails.images}
                    renderItem={({ item }) => (
                      <Image
                        source={{ uri: item.base64_image }}
                        style={styles.modalImage}
                        resizeMode="cover"
                      />
                    )}
                    keyExtractor={item => item.id.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                  />

                  {/* AI FOOD ANALYSIS */}
                  {selectedFoodUpdateDetails.analysis && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={styles.analysisTitle}>Food Analysis</Text>

                      <Text style={styles.analysisLabel}>Identified Food:</Text>
                      <Text style={styles.analysisValue}>
                        {selectedFoodUpdateDetails.analysis.food_identified}
                      </Text>

                      <Text style={styles.analysisLabel}>Healthy?</Text>
                      <Text
                        style={[
                          styles.analysisValue,
                          {
                            color: selectedFoodUpdateDetails.analysis.is_healthy ? "green" : "red",
                            fontWeight: "bold",
                          },
                        ]}
                      >
                        {selectedFoodUpdateDetails.analysis.is_healthy ? "Yes" : "No"}
                      </Text>

                      <Text style={styles.analysisLabel}>Goal Alignment:</Text>
                      <Text style={styles.analysisValue}>
                        {selectedFoodUpdateDetails.analysis.goal_alignment}
                      </Text>

                      <Text style={styles.analysisLabel}>Personalized Advice:</Text>
                      <Text style={styles.analysisValue}>
                        {selectedFoodUpdateDetails.analysis.personalized_advice}
                      </Text>

                      {selectedFoodUpdateDetails.analysis.correction ? (
                        <>
                          <Text style={styles.analysisLabel}>Correction:</Text>
                          <Text style={styles.analysisValue}>
                            {selectedFoodUpdateDetails.analysis.correction}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  )}

                  {/* Close Button */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setFoodDetailsModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dashboardModalContainer: {
    width: '90%',
    height: '75%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  createdAtText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '60%',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  foodUpdateItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  uploadButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePopupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  fullImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 12,
  },
  closeButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },

  analysisLabel: {
    fontSize: 15,
    marginTop: 10,
    fontWeight: "bold",
    color: "#555",
  },

  analysisValue: {
    fontSize: 15,
    marginTop: 4,
    color: "#333",
    lineHeight: 20,
  },
  modalImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },

  deleteIconContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 3,
    zIndex: 10,
  },

  deleteIcon: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FoodUpdateScreen;