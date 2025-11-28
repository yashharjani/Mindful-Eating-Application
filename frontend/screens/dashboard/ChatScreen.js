import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import BASE_URL from "../../utils/config";

const DEFAULT_WELCOME_MESSAGE = {
  id: "welcome-1",
  text: "Hi, how can I help you today?",
  sender: "assistant",
  timestamp: new Date().toISOString(),
};

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const flatListRef = useRef(null);
  const POLL_INTERVAL = 2500;

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Load Latest Session on Mount
  useEffect(() => {
    loadLatestSession();

    const interval = setInterval(async () => {
      if (sessionId) {
        const msgs = await loadMessages(sessionId, true);
        if (msgs.length > 0) {
          setMessages(msgs);
        }
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Load Latest Session
  const loadLatestSession = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`${BASE_URL}/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.length > 0) {
        const latest = response.data[0];
        setSessionId(latest.id);

        const msgs = await loadMessages(latest.id, true);

        if (!initialized) {
          if (msgs.length === 0) {
            setMessages([DEFAULT_WELCOME_MESSAGE]);
          } else {
            setMessages(msgs);
          }
          setInitialized(true);
        } else {
          setMessages(msgs);
        }
      } else {
        // No session exists — FIRST EVER CHAT
        if (!initialized) {
          setMessages([DEFAULT_WELCOME_MESSAGE]);
          setInitialized(true);
        }
      }

      setIsLoading(false);
    } catch (e) {
      console.log("Error loading latest session:", e);
      if (!initialized) setMessages([DEFAULT_WELCOME_MESSAGE]);
      setInitialized(true);
      setIsLoading(false);
    }
  };

  // Load Messages for Session (returns messages)
  const loadMessages = async (sid, silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/chat/session/${sid}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const formatted = response.data.map((msg) => ({
        id: msg.id.toString(),
        text: msg.content,
        sender: msg.role === "assistant" ? "assistant" : "user",
        timestamp: msg.created_at,
      }));

      return formatted;
    } catch (error) {
      console.log("Error loading messages:", error);
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Send Message
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userTempMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userTempMessage]);
    setInputText("");

    scrollToBottom();

    try {
      setIsTyping(true);
      const token = await AsyncStorage.getItem("token");

      const response = await axios.post(
        `${BASE_URL}/chat/message`,
        {
          prompt: userTempMessage.text,
          session_id: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const backendMsg = response.data.message;

      const assistantMsg = {
        id: backendMsg.id.toString(),
        text: backendMsg.content,
        sender: "assistant",
        timestamp: backendMsg.created_at,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      scrollToBottom();

      if (!sessionId) {
        setSessionId(response.data.session_id);
      }
    } catch (error) {
      console.log("Error sending message:", error);
      setIsTyping(false);
      Alert.alert("Error", "Unable to get response from the assistant.");
    }
  };

  // Auto Scroll to Bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Render Message Bubble
  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === "user" ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View
        style={{
          flex: 1,
          paddingBottom: Platform.OS === "android" ? 6 : 0,
        }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={scrollToBottom}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Assistant is typing...</Text>
            <ActivityIndicator size="small" color="#3498db" />
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() ? "#3498db" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 80,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: "#3498db",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    alignItems: "flex-start",
  },

  assistantBubble: {
    backgroundColor: "#e5e5e5",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    alignItems: "flex-start",
  },
  markdown: {
    body: {
      fontSize: 16,
      color: "#000",
      flexShrink: 1,
    },
    paragraph: {
      marginBottom: 6,
      flexShrink: 1,
    },
  },
  typingIndicator: { flexDirection: "row", alignItems: "center", padding: 10 },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 10,
    color: "#777",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  typingText: { marginRight: 8, color: "#666" },
    messageText: {
    fontSize: 15,
    color: "#000",
  },
});

export default ChatScreen;