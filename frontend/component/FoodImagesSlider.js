import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, FlatList, Modal } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import BASE_URL from '../utils/config';

const FoodImagesSlider = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFoodUpdate, setSelectedFoodUpdate] = useState(null);
  const [foodUpdateDetails, setFoodUpdateDetails] = useState(null);
  const flatListRef = useRef(null);
  
  const { width } = Dimensions.get('window');
  const ITEM_WIDTH = width; // Each item takes full width to ensure centering

  useFocusEffect(
    useCallback(() => {
      fetchUserUploadedImages();
    }, [])
  );

  const fetchUserUploadedImages = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/food-update/user-uploaded-images`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.data && response.data.data.length > 0) {
        setImages(response.data.data);
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const fetchFoodUpdateDetails = async (foodUpdateId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/food-update/food-update/${foodUpdateId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.data) {
        setFoodUpdateDetails(response.data.data);
        setModalVisible(true);
      }
    } catch (err) {
      console.error('Error fetching food update details:', err);
      setError('Failed to load food update details');
    }
  };

  const handleImagePress = (foodUpdateId) => {
    setSelectedFoodUpdate(foodUpdateId);
    fetchFoodUpdateDetails(foodUpdateId);
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const goToSlide = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
    }
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity onPress={() => handleImagePress(item.food_update_id)}>
        <View style={[styles.slide, { width: ITEM_WIDTH }]}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.base64_image }}
              style={styles.slideImage}
              resizeMode="contain"
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.uploadDate}>
                {new Date(item.uploaded_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {images.map((_, index) => (
          <TouchableOpacity 
            key={index} 
            style={[
              styles.paginationDot,
              activeIndex === index ? styles.paginationDotActive : {}
            ]}
            onPress={() => goToSlide(index)}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserUploadedImages}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No food images uploaded yet</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="center"
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
      />
      {renderPagination()}

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {foodUpdateDetails && (
              <>
                <Text style={styles.modalTitle}>Food Journey Description</Text>
                <Text style={styles.modalDescription}>{foodUpdateDetails.description}</Text>
                {/* Display the created_at timestamp */}
                <Text style={styles.createdAtText}>
                  Food Journey Date: {new Date(foodUpdateDetails.created_at).toLocaleString()}
                </Text>
                <FlatList
                  data={foodUpdateDetails.images}
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
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 10,
  },
  slide: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  slideImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 8,
  },
  uploadDate: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#3498db',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loaderContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffeeee',
    borderRadius: 10,
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
  },
  emptyText: {
    color: '#7f8c8d',
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginHorizontal: 10,
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
  createdAtText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default FoodImagesSlider;