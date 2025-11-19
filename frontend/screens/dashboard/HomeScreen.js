import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL from '../../utils/config';
import FoodImagesSlider from '../../component/FoodImagesSlider.js';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install this package

const HomeScreen = ({ route }) => {
    const { userName } = route.params;
    const [goal, setGoal] = useState('');
    const [selectedBehavior, setSelectedBehavior] = useState('');
    const [behaviors, setBehaviors] = useState([]);
    const [tips, setTips] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [refreshingTips, setRefreshingTips] = useState(false);
    const [tipsLoading, setTipsLoading] = useState(false);

    const fetchGoal = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.get(`${BASE_URL}/goal/get-user-goal`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.data.data) {
                setGoal(response.data.data.goal_text);
            } else {
                setGoal('');
            }
        } catch (err) {
            setError('Failed to fetch goal');
        } finally {
            setLoading(false);
        }
    };

    const fetchBehaviors = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.get(`${BASE_URL}/behavior/check-behavior-submission`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            // Filter behaviors to only include high_priority ones
            const highPriorityBehaviors = response.data.data.filter(
                behavior => behavior.high_priority === true
            );
            setBehaviors(highPriorityBehaviors);
            
            // Only auto-select first behavior when editing existing goal
            if (isEditing && highPriorityBehaviors.length > 0) {
                setSelectedBehavior(highPriorityBehaviors[0].behavior_title);
            }
        } catch (err) {
            setError('Failed to fetch behaviors');
        } finally {
            setLoading(false);
        }
    };

    // const fetchTips = async () => {
    //     setRefreshingTips(true);

    //     try {
    //         const token = await AsyncStorage.getItem('token');
    //         const response = await axios.get(`${BASE_URL}/tips/get-user-tips`, {
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //             },
    //         });

    //         const { message, data } = response.data;

    //         // CASE 1: No goal set
    //         if (!data) {
    //             setTips(message);   // Show this inside the tip box
    //             return;
    //         }

    //         // CASE 2: Tip exists
    //         setTips(data.tips_text);

    //     } catch (err) {
    //         setTips("Unable to fetch tip at the moment.");
    //     } finally {
    //         setRefreshingTips(false);
    //     }
    // };

    const fetchTips = async () => {
        setTipsLoading(true);

        try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.get(`${BASE_URL}/tips/get-user-tips`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const { message, data } = response.data;

            if (!data) {
                setTips(message);
            } else {
                setTips(data.tips_text);
            }

        } catch (err) {
            setTips("Unable to fetch tip at the moment.");
        } finally {
            setTipsLoading(false);
        }
    };

    const handleSubmitGoal = async () => {
        if (!selectedBehavior) {
            setError('Please select a behavior');
            return;
        }
        
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            await axios.post(
                `${BASE_URL}/goal/submit-user-goal`,
                { goal_text: selectedBehavior },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            // setIsEditing(false);
            // setGoal(selectedBehavior);
            // fetchGoal();
            setIsEditing(false);
            setGoal(selectedBehavior);

            // Fetch updated goal AND updated tip
            await fetchGoal();
            await fetchTips();
        } catch (err) {
            setError('Failed to submit goal');
        } finally {
            setLoading(false);
        }
    };

    const handleEditGoal = () => {
        setIsEditing(true);
        fetchBehaviors(); // Refresh behaviors when editing
    };

    const handleRefreshTips = () => {
        fetchTips();
    };

    useFocusEffect(
        useCallback(() => {
            fetchGoal();
            fetchTips();
            fetchBehaviors();
        }, [])
    );

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshingTips}
                    onRefresh={fetchTips}
                />
            }
        >
            <Text style={styles.heading}>Welcome, {userName}!</Text>
            
            {/* Goal Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Goal</Text>
                {goal && !isEditing ? (
                    <View style={styles.goalContainer}>
                        <Text style={styles.goalText}>{goal}</Text>
                        <TouchableOpacity style={styles.editButton} onPress={handleEditGoal}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedBehavior}
                                onValueChange={(itemValue) => setSelectedBehavior(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item 
                                    label="Please select one of your behaviors to set goal for today" 
                                    value="" 
                                    enabled={false}
                                />
                                {behaviors.map((behavior) => (
                                    <Picker.Item
                                        key={behavior.behavior_id}
                                        label={behavior.behavior_title}
                                        value={behavior.behavior_title}
                                    />
                                ))}
                            </Picker>
                        </View>
                        <TouchableOpacity 
                            style={[styles.button, !selectedBehavior && styles.disabledButton]} 
                            onPress={handleSubmitGoal}
                            disabled={!selectedBehavior}
                        >
                            <Text style={styles.buttonText}>{isEditing ? 'Update Goal' : 'Set Goal'}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
            
            {/* Food Images Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Food Journey</Text>
                <FoodImagesSlider />
            </View>
            
            {/* Tips Section */}
            <View style={styles.section}>
                <View style={styles.tipsHeader}>
                    <Text style={styles.sectionTitle}>Today's Tips</Text>
                    <TouchableOpacity onPress={handleRefreshTips} disabled={refreshingTips}>
                        <Ionicons name="refresh" size={24} color={refreshingTips ? '#ccc' : '#3498db'} />
                    </TouchableOpacity>
                </View>
                {/* <View style={styles.tipsContainer}>
                    {refreshingTips ? (
                        <ActivityIndicator size="small" color="#3498db" />
                    ) : (
                        <Text style={styles.tipsText}>{tips}</Text>
                    )}
                </View> */}
                <View style={styles.tipsContainer}>
                    {tipsLoading ? (
                        <ActivityIndicator size="small" color="#3498db" />
                    ) : (
                        <Text style={styles.tipsText}>{tips}</Text>
                    )}
                </View>
            </View>
            
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3498db',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2c3e50',
    },
    button: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 10,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    goalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    goalText: {
        fontSize: 16,
        color: '#555',
        flex: 1,
    },
    editButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginLeft: 10,
    },
    editButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tipsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tipsContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#f5f5f5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        minHeight: 100,
        justifyContent: 'center',
    },
    tipsText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'left',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    picker: {
        width: '100%',
    },
});

export default HomeScreen;