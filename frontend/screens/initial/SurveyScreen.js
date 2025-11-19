import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  Modal,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RadioButton, Checkbox } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import BASE_URL from '../../utils/config';
import { countries } from '../../utils/countries';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/FontAwesome';

const SurveyScreen = ({ navigation }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [foodBehaviors, setFoodBehaviors] = useState([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBehaviorDescription, setSelectedBehaviorDescription] = useState('');
  const [isPriorityPageVisible, setIsPriorityPageVisible] = useState(false);
  const [highPriorityBehaviors, setHighPriorityBehaviors] = useState([]);
  const [countryPickerState, setCountryPickerState] = useState({});
  const flatListRef = useRef();

  useEffect(() => {
    fetchSurveyQuestions();
    fetchFoodBehaviors();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      const textQuestions = questions.filter(q => q.question_type !== 'RADIO');
      const radioQuestions = questions.filter(q => q.question_type === 'RADIO');
      const textPages = Math.ceil((textQuestions.length - 1) / 5);
      const radioPages = Math.ceil(radioQuestions.length / 5);
      setTotalPages(textPages + radioPages + 1);
    }
  }, [questions]);

  const CountrySelector = ({ questionId, value, onSelect, placeholder }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filteredCountries, setFilteredCountries] = useState([]);

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
      onSelect(questionId, selectedCountry.label);
      setShowPicker(false);
      setSearchText('');
      setFilteredCountries([]);
    };

    return (
      <>
        <TouchableOpacity 
          style={styles.countrySelector} 
          onPress={() => setShowPicker(!showPicker)}
        >
          <Text style={value ? styles.selectedValue : styles.placeholderText}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.countryPickerContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={filterCountries}
              placeholder="Search countries..."
              placeholderTextColor="#A9A9A9"
              blurOnSubmit={false}
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
      </>
    );
  };

  const fetchSurveyQuestions = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/question/question-list`);
      setQuestions(response.data.data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to fetch questions.',
      });
    }
  };

  const fetchFoodBehaviors = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/behavior/behavior-list`);
      setFoodBehaviors(response.data.data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to fetch food behaviors.',
      });
    }
  };

  const handleInputChange = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleMultiSelectChange = (questionId, option) => {
    setAnswers((prev) => {
      const currentAnswers = prev[questionId] || [];
      const updatedAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter((item) => item !== option)
        : [...currentAnswers, option];
      return { ...prev, [questionId]: updatedAnswers };
    });
  };

  const handlePageChange = (direction) => {
    const currentPageQuestions = getQuestionsForCurrentPage();

    const allAnswered = currentPageQuestions.every((q) => {
      const answer = answers[q.id];
      if (!answer) return false;

      switch (q.question_type) {
        case 'DROPDOWN_TEXT':
          return answer.selected_option && answer.text;
        case 'DROPDOWN_CHECKBOX':
          return answer.selected_option && answer.checkboxes;
        case 'MULTI_SELECT_DROPDOWN':
          return Array.isArray(answer) && answer.length > 0;
        default:
          return true;
      }
    });

    if (!allAnswered) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please answer all questions on this page before proceeding.',
      });
      return;
    }

    if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  };

  const handleSubmitSurvey = async () => {
    const lastQuestion = questions[questions.length - 1];
    if (lastQuestion && lastQuestion.question_type === 'TEXT') {
      const lastAnswer = answers[lastQuestion.id] || '';

      if (lastAnswer.length < 100 || lastAnswer.length > 200) {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: 'Please provide between 100 and 200 characters for the last question.',
        });
        return;
      }
    }
    
    if (!validateAnswers()) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please provide valid answers for all questions.',
      });
      return;
    }
    
    const unansweredQuestions = questions.filter((q) => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      const unansweredText = unansweredQuestions.map((q) => q.question_text).join('\n');
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: `Please answer the following questions before submitting:\n\n${unansweredText}`,
      });
      return;
    }
    
    const answerList = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id],
    }));
    
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Session expired. Please log in again.',
      });
      navigation.replace('Login');
      return;
    }
    
    try {
      await axios.post(
        `${BASE_URL}/question/submit-answers`,
        { answer_list: answerList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: 'Survey submitted successfully',
      });
      navigation.replace('Dashboard');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Survey submission failed. Please try again.',
      });
    }
  };

  const handleBehaviorSelection = (behaviorId) => {
    setSelectedBehaviors((prev) =>
      prev.includes(behaviorId)
        ? prev.filter((id) => id !== behaviorId)
        : [...prev, behaviorId]
    );
  };

  const BehaviorDescriptionModal = () => {
    return (
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Behavior Description</Text>
              <Text style={styles.modalDescription}>{selectedBehaviorDescription}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const validateAnswers = () => {
    for (const q of questions) {
      const answer = answers[q.id];
      if (!answer) return false;
      switch (q.question_type) {
        case 'DROPDOWN_TEXT':
          if (!answer.selected_option || !answer.text) return false;
          break;
        case 'DROPDOWN_CHECKBOX':
          if (!answer.selected_option || !answer.checkboxes) return false;
          break;
        case 'MULTI_SELECT_DROPDOWN':
          if (!Array.isArray(answer) || answer.length === 0) return false;
          break;
        default:
          break;
      }
    }
    return true;
  };

  const renderQuestion = (q, isLastQuestion = false) => {
    if (isLastQuestion && q.question_type === 'TEXT') {
      return (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.largeTextInput}
            multiline={true}
            value={answers[q.id] || ''}
            onChangeText={(text) => handleInputChange(q.id, text)}
            placeholderTextColor="#A9A9A9"
            textAlignVertical="top"
            blurOnSubmit={false}
          />
          <Text style={styles.characterCount}>
            {`${(answers[q.id] || '').length}/200 characters (minimum 100, maximum 200)`}
          </Text>
          <View style={styles.progressIndicator} />
        </View>
      );
    }
    
    switch (q.question_type) {
      case 'RADIO':
        return (
          <RadioButton.Group
            onValueChange={(value) => handleInputChange(q.id, value)}
            value={answers[q.id]}
          >
            {q.options.map((option) => (
              <View key={option} style={styles.radioOption}>
                <RadioButton
                  value={option}
                  status={answers[q.id] === option ? 'checked' : 'unchecked'}
                  // onPress={() => handleInputChange(q.id, option)}
                />
                <Text style={styles.radioButtonLabel}>{option}</Text>
              </View>
            ))}
          </RadioButton.Group>
        );
      case 'DROPDOWN':
        return (
          <View style={styles.inputContainer}>
            <Picker
              selectedValue={answers[q.id] || ''}
              onValueChange={(itemValue) => handleInputChange(q.id, itemValue)}
              style={styles.picker}
              dropdownIconColor="#000"
            >
              <Picker.Item label={q.question_text} value="" />
              {q.options.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
            <View style={styles.progressIndicator} />
          </View>
        );
      case 'MULTI_SELECT_DROPDOWN':
        return (
          <View>
            {q.options.map((option) => (
              <View key={option} style={styles.checkboxOption}>
                <Checkbox
                  status={answers[q.id]?.includes(option) ? 'checked' : 'unchecked'}
                  onPress={() => handleMultiSelectChange(q.id, option)}
                />
                <Text style={styles.checkboxLabel}>{option}</Text>
              </View>
            ))}
          </View>
        );
      case 'NUMBER':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter a number"
              keyboardType="numeric"
              value={answers[q.id] || ''}
              onChangeText={(text) => handleInputChange(q.id, text)}
              placeholderTextColor="#A9A9A9"
              blurOnSubmit={false}
            />
            <View style={styles.progressIndicator} />
          </View>
        );
      case 'TEXT':
        if (q.question_text === "Country of Origin") {
          return (
            <View style={styles.inputContainer}>
              <CountrySelector
                questionId={q.id}
                value={answers[q.id] || ''}
                onSelect={handleInputChange}
                placeholder={q.question_text}
              />
              <View style={styles.progressIndicator} />
            </View>
          );
        }

        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={q.question_text}
              value={answers[q.id] || ''}
              onChangeText={(text) => handleInputChange(q.id, text)}
              placeholderTextColor="#A9A9A9"
              blurOnSubmit={false}
            />
            <View style={styles.progressIndicator} />
          </View>
        );
      case 'SLIDER':
        return (
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={q.range[0]}
              maximumValue={q.range[1]}
              step={1}
              value={answers[q.id] ? parseFloat(answers[q.id]) : q.range[0]}
              onValueChange={(value) => handleInputChange(q.id, value.toString())}
            />
            <Text style={styles.sliderValue}>{answers[q.id] || q.range[0]}</Text>
          </View>
        );
      case 'DROPDOWN_TEXT':
        return (
          <View>
            <View style={styles.inputContainer}>
              <Picker
                selectedValue={answers[q.id]?.selected_option || ''}
                onValueChange={(itemValue) => handleInputChange(q.id, { selected_option: itemValue, text: answers[q.id]?.text || '' })}
                style={styles.picker}
                dropdownIconColor="#000"
              >
                <Picker.Item label={q.question_text} value="" />
                {q.options.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
              <View style={styles.progressIndicator} />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Additional details..."
                value={answers[q.id]?.text || ''}
                onChangeText={(text) => handleInputChange(q.id, { ...answers[q.id], text })}
                placeholderTextColor="#A9A9A9"
                blurOnSubmit={false}
              />
              <View style={styles.progressIndicator} />
            </View>
          </View>
        );
      case 'DROPDOWN_CHECKBOX':
        return (
          <View>
            <View style={styles.inputContainer}>
              <Picker
                selectedValue={answers[q.id]?.selected_option || ''}
                onValueChange={(itemValue) => handleInputChange(q.id, { selected_option: itemValue, checkboxes: answers[q.id]?.checkboxes || [] })}
                style={styles.picker}
                dropdownIconColor="#000"
              >
                <Picker.Item label={q.question_text} value="" />
                {q.options.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
              <View style={styles.progressIndicator} />
            </View>
            {q.checkbox_options.map((checkboxOption) => (
              <View key={checkboxOption} style={styles.checkboxOption}>
                <Checkbox
                  status={answers[q.id]?.checkboxes?.includes(checkboxOption) ? 'checked' : 'unchecked'}
                  onPress={() => {
                    const updatedCheckboxes = answers[q.id]?.checkboxes?.includes(checkboxOption)
                      ? answers[q.id].checkboxes.filter((item) => item !== checkboxOption)
                      : [...(answers[q.id]?.checkboxes || []), checkboxOption];
                    handleInputChange(q.id, { ...answers[q.id], checkboxes: updatedCheckboxes });
                  }}
                />
                <Text style={styles.checkboxLabel}>{checkboxOption}</Text>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  const renderFoodBehaviors = () => {
    return (
      <View style={styles.foodBehaviorContainer}>
        <Text style={styles.foodBehaviorTitle}>Select Your Food Behaviors</Text>
        {foodBehaviors.map((behavior) => (
          <View key={behavior.id} style={styles.checkboxOption}>
            <Checkbox
              status={selectedBehaviors.includes(behavior.id) ? 'checked' : 'unchecked'}
              onPress={() => handleBehaviorSelection(behavior.id)}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
              <Text style={styles.checkboxLabel}>{behavior.behavior_title}</Text>
              <TouchableOpacity
                onPress={() => handleBehaviorDescription(behavior.id)}
                style={{ marginLeft: 6 }}
              >
                <Icon name="question-circle" size={20} color="#3498db" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleBehaviorDescription = (behaviorId) => {
    const selectedBehavior = foodBehaviors.find((behavior) => behavior.id === behaviorId);
    if (selectedBehavior) {
      setSelectedBehaviorDescription(selectedBehavior.description);
      setIsModalVisible(true);
    }
  };

  const getQuestionsForCurrentPage = () => {
    if (!questions.length) return [];

    const textQuestions = questions.filter(q => q.question_type !== 'RADIO');
    const radioQuestions = questions.filter(q => q.question_type === 'RADIO');
    const textPages = Math.ceil((textQuestions.length - 1) / 5);
    const radioPages = Math.ceil(radioQuestions.length / 5);

    if (currentPage <= textPages) {
      const startIndex = (currentPage - 1) * 5;
      const endIndex = Math.min(startIndex + 5, textQuestions.length - 1);
      return textQuestions.slice(startIndex, endIndex);
    } else if (currentPage <= textPages + radioPages) {
      const startIndex = (currentPage - textPages - 1) * 5;
      const endIndex = Math.min(startIndex + 5, radioQuestions.length);
      return radioQuestions.slice(startIndex, endIndex);
    } else {
      return [textQuestions[textQuestions.length - 1]];
    }
  };

  const handleSaveOrNext = () => {
    const lastQuestion = questions[questions.length - 1];
    if (lastQuestion && lastQuestion.question_type === 'TEXT') {
      const lastAnswer = answers[lastQuestion.id] || '';

      if (lastAnswer.length < 100 || lastAnswer.length > 200) {
        Toast.show({
          type: 'error',
          text1: 'Something Went Wrong!',
          text2: 'Please provide between 100 and 200 characters for the last question.',
        });
        return;
      }
    }

    const allAnswered = questions.every((q) => {
      const answer = answers[q.id];
      if (!answer) return false;

      switch (q.question_type) {
        case 'DROPDOWN_TEXT':
          return answer.selected_option && answer.text;
        case 'DROPDOWN_CHECKBOX':
          return answer.selected_option && answer.checkboxes;
        case 'MULTI_SELECT_DROPDOWN':
          return Array.isArray(answer) && answer.length > 0;
        default:
          return true;
      }
    });

    if (!allAnswered) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please answer all questions before submitting.',
      });
      return;
    }

    if (selectedBehaviors.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please select at least one food behavior.',
      });
      return;
    }

    if (selectedBehaviors.length <= 3) {
      submitBehaviors();
      handleSubmitSurvey();
    } else {
      setIsPriorityPageVisible(true);
    }
  };

  const renderPrioritySelectionPage = () => {
    return (
      <View style={styles.priorityPageContainer}>
        <Text style={styles.priorityPageTitle}>Select up to 3 most relevant Behaviors</Text>
        {selectedBehaviors.map((behaviorId) => {
          const behavior = foodBehaviors.find((b) => b.id === behaviorId);
          return (
            <View key={behaviorId} style={styles.checkboxOption}>
              <Checkbox
                status={highPriorityBehaviors.includes(behaviorId) ? 'checked' : 'unchecked'}
                onPress={() => {
                  setHighPriorityBehaviors((prev) =>
                    prev.includes(behaviorId)
                      ? prev.filter((id) => id !== behaviorId)
                      : prev.length < 3
                      ? [...prev, behaviorId]
                      : prev
                  );
                }}
                disabled={highPriorityBehaviors.length >= 3 && !highPriorityBehaviors.includes(behaviorId)}
              />
              <Text style={styles.checkboxLabel}>{behavior.behavior_title}</Text>
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            submitPriorityBehaviors();
            handleSubmitSurvey();
          }}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const submitPriorityBehaviors = async () => {
    if (highPriorityBehaviors.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Please select at least one high-priority behavior.',
      });
      return;
    }

    const behaviorList = selectedBehaviors.map((id) => ({
      behavior_id: id,
      first_priority: true,
      high_priority: highPriorityBehaviors.includes(id),
    }));

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${BASE_URL}/behavior/submit-behavior`,
        { behavior_list: behaviorList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: 'Behaviors submitted successfully',
      });
      navigation.replace('Dashboard');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to submit behaviors. Please try again.',
      });
    }
  };

  const submitBehaviors = async () => {
    const behaviorList = selectedBehaviors.map((id, index) => ({
      behavior_id: id,
      first_priority: true,
      high_priority: true,
    }));

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${BASE_URL}/behavior/submit-behavior`,
        { behavior_list: behaviorList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: 'Great!',
        text2: 'Behaviors submitted successfully',
      });
      navigation.replace('Dashboard');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something Went Wrong!',
        text2: 'Failed to submit behaviors. Please try again.',
      });
    }
  };

  const isLastPage = currentPage === totalPages;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Uncover Your Personality Through Food</Text>

        {isPriorityPageVisible ? (
          renderPrioritySelectionPage()
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={getQuestionsForCurrentPage()}
              keyExtractor={(q) => q.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: q }) => (
                <View style={styles.questionContainer}>
                  <Text style={[styles.questionText, isLastPage ? styles.lastQuestionText : null]}>
                    {(!isLastPage && q.question_type === "TEXT") || q.question_type === "DROPDOWN" ? "" : q.question_text}
                  </Text>
                  {renderQuestion(q, isLastPage)}
                </View>
              )}
              ListFooterComponent={
                <>
                  {isLastPage && !isPriorityPageVisible && renderFoodBehaviors()}
                  <View style={{ height: 100 }} />
                </>
              }
              contentContainerStyle={styles.scrollContainer}
            />

            <View style={styles.fixedBottomContainer}>
              {isLastPage ? (
                <TouchableOpacity style={styles.submitButton} onPress={handleSaveOrNext}>
                  <Text style={styles.submitButtonText}>
                    {selectedBehaviors.length > 3 ? 'Next' : 'Save'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.pagination}>
                  {currentPage > 1 && (
                    <TouchableOpacity style={styles.button} onPress={() => handlePageChange('prev')}>
                      <Text style={styles.buttonText}>&lt; Previous</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.pageIndicator}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  {currentPage < totalPages && (
                    <TouchableOpacity style={styles.button} onPress={() => handlePageChange('next')}>
                      <Text style={styles.buttonText}>Next &gt;</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </View>

      <BehaviorDescriptionModal />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    paddingBottom: 120, // Extra space for the fixed buttons
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  lastQuestionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
    includeFontPadding: false,
  },
  largeTextInput: {
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#000',
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    paddingRight: 10,
    paddingBottom: 5,
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
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioButtonLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodBehaviorContainer: {
    marginTop: 20,
  },
  foodBehaviorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  priorityPageContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  priorityPageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'justify',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#3498db',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default SurveyScreen;