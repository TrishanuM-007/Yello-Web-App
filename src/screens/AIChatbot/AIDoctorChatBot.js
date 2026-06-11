/**
 * src/screens/AIDoctorScreen.js
 * Yello Companion App — AI Doctor Chat Screen
 *
 * Uses aiDoctorService.js which routes through Firebase Cloud Function.
 * No API keys in this file.
 *
 * Navigation usage:
 *   navigation.navigate("AIDoctor", { userId: currentUser.uid })
 *   — or add to your drawer/tab navigator
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, StatusBar, Animated, Easing,
} from "react-native";
import {
  sendMessage,
  saveConversation,
  loadConversation,
} from "../../services/aiDoctorService";

// ─── Theme ────────────────────────────────────────────────────────────────
const YELLO_BLUE      = "#1A6FBF";
const YELLO_LIGHT_BLUE= "#E6F4FE";
const YELLO_ACCENT    = "#F5A623";
const YELLO_GREEN     = "#27AE60";
const YELLO_RED       = "#E74C3C";
const BG              = "#F0F7FF";

const QUICK_SYMPTOMS = [
  "Fever & headache", "Chest pain", "Stomach ache",
  "Cold & cough", "Fatigue", "Back pain",
];

// ─── Typing indicator ─────────────────────────────────────────────────────
function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(dot, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.ease }),
          Animated.delay((dots.length - i) * 180),
        ])
      )
    );
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.aiBubbleWrapper}>
        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>Dr</Text></View>
        <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
          {dots.map((dot, i) => (
            <Animated.View key={i} style={[styles.typingDot, {
              opacity: dot,
              transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
            }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser   = message.role === "user";
  const isUrgent = !isUser && /emergency|immediately|call 911|ER|urgent|ambulance/i.test(message.content);
  const isBooking= !isUser && /appointment|book|schedule|specialist/i.test(message.content);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim= useRef(new Animated.Value(isUser ? 30 : -30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.messageRow,
      isUser ? styles.userRow : styles.aiRow,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
    ]}>
      {!isUser && (
        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>Dr</Text></View>
      )}
      <View style={[
        styles.bubble,
        isUser    ? styles.userBubble    : styles.aiBubble,
        isUrgent  && styles.urgentBubble,
        isBooking && !isUrgent && styles.bookingBubble,
      ]}>
        {isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>⚠ URGENT</Text>
          </View>
        )}
        {isBooking && !isUrgent && (
          <View style={styles.bookingBadge}>
            <Text style={styles.bookingBadgeText}>📅 Appointment</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.aiBubbleText]}>
          {message.content}
        </Text>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
          {message.time}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────
export default function AIDoctorScreen({ route }) {
  const userId = route?.params?.userId || "guest";

  const [messages,           setMessages]           = useState([]);
  const [conversationHistory,setConversationHistory] = useState([]);
  const [inputText,          setInputText]           = useState("");
  const [isLoading,          setIsLoading]           = useState(false);
  const [showQuickSymptoms,  setShowQuickSymptoms]   = useState(true);
  const flatListRef = useRef(null);

  const getTime = () => {
    const now = new Date();
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  // Load prior history or get greeting on mount
  useEffect(() => {
    (async () => {
      const history = await loadConversation(userId);
      if (history.length > 0) {
        setConversationHistory(history);
        setMessages(history.map((m, i) => ({
          id: String(i), role: m.role, content: m.content, time: "",
        })));
        setShowQuickSymptoms(false);
      } else {
        // Kick off greeting
        await dispatchToAI([{ role: "user", content: "Hello" }], true);
      }
    })();
  }, []);

  const dispatchToAI = useCallback(async (history, isGreeting = false) => {
    setIsLoading(true);
    try {
      const reply = await sendMessage(history);

      const aiMsg = { id: Date.now().toString(), role: "assistant", content: reply, time: getTime() };
      const newHistory = isGreeting
        ? [{ role: "assistant", content: reply }]
        : [...history, { role: "assistant", content: reply }];

      setMessages((prev) => [...prev, aiMsg]);
      setConversationHistory(newHistory);
      await saveConversation(userId, newHistory);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(), role: "assistant",
        content: "I'm having a moment of technical difficulty. Please try again — I'm here to help.",
        time: getTime(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleSend = useCallback(async (text) => {
    const msg = (text || inputText).trim();
    if (!msg || isLoading) return;

    setInputText("");
    setShowQuickSymptoms(false);

    const userMsg = { id: Date.now().toString(), role: "user", content: msg, time: getTime() };
    const newHistory = [...conversationHistory, { role: "user", content: msg }];
    setMessages((prev) => [...prev, userMsg]);
    setConversationHistory(newHistory);
    await dispatchToAI(newHistory);
  }, [inputText, isLoading, conversationHistory, dispatchToAI]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={YELLO_BLUE} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>Dr</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Dr. Yello</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSubtitle}>AI Medical Assistant • Always available</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>Yello</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        {/* Quick symptom chips */}
        {showQuickSymptoms && messages.length <= 1 && (
          <View style={styles.quickSection}>
            <Text style={styles.quickLabel}>Common symptoms</Text>
            <View style={styles.quickRow}>
              {QUICK_SYMPTOMS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.quickChip}
                  onPress={() => handleSend(s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            🩺 AI guidance only. Always consult a doctor for diagnosis.
          </Text>
        </View>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your symptoms..."
            placeholderTextColor="#9BB4CC"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: YELLO_BLUE },

  header: {
    backgroundColor: YELLO_BLUE, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: YELLO_ACCENT,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  headerAvatarText: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: YELLO_GREEN },
  headerSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  headerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },

  messageList: { paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 8, backgroundColor: BG, flexGrow: 1 },
  messageRow: { marginBottom: 14, flexDirection: "row", alignItems: "flex-end", maxWidth: "100%" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start", gap: 8 },
  aiAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: YELLO_ACCENT,
    justifyContent: "center", alignItems: "center", marginRight: 2, flexShrink: 0,
  },
  aiAvatarText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  bubble: {
    maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2,
  },
  userBubble:    { backgroundColor: YELLO_BLUE, borderBottomRightRadius: 4 },
  aiBubble:      { backgroundColor: "#fff",     borderBottomLeftRadius:  4 },
  urgentBubble:  { borderWidth: 2,   borderColor: YELLO_RED,   backgroundColor: "#FFF5F5" },
  bookingBubble: { borderWidth: 1.5, borderColor: YELLO_GREEN, backgroundColor: "#F0FFF7" },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: "#fff" },
  aiBubbleText:   { color: "#1A2B3C" },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.6 },
  userTimestamp: { color: "rgba(255,255,255,0.75)", textAlign: "right" },
  aiTimestamp:   { color: "#6B8CAE" },
  urgentBadge: {
    backgroundColor: YELLO_RED, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: "flex-start", marginBottom: 6,
  },
  urgentBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  bookingBadge: {
    backgroundColor: YELLO_GREEN, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: "flex-start", marginBottom: 6,
  },
  bookingBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  aiBubbleWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  typingContainer: { paddingHorizontal: 14, marginBottom: 14 },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 14, paddingHorizontal: 16, minWidth: 60 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: YELLO_BLUE },

  quickSection: { backgroundColor: BG, paddingHorizontal: 14, paddingBottom: 8 },
  quickLabel: { color: "#6B8CAE", fontSize: 12, fontWeight: "600", marginBottom: 8, letterSpacing: 0.4, textTransform: "uppercase" },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { backgroundColor: YELLO_LIGHT_BLUE, borderWidth: 1, borderColor: YELLO_BLUE + "40", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  quickChipText: { color: YELLO_BLUE, fontSize: 13, fontWeight: "600" },

  disclaimer: { backgroundColor: "#FFF9ED", paddingVertical: 6, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: "#F5E9CC" },
  disclaimerText: { color: "#8B6914", fontSize: 11, textAlign: "center" },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff",
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: "#DDE8F0",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  input: {
    flex: 1, backgroundColor: YELLO_LIGHT_BLUE, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#1A2B3C",
    maxHeight: 100, borderWidth: 1, borderColor: YELLO_BLUE + "30",
  },
  sendButton: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: YELLO_BLUE,
    justifyContent: "center", alignItems: "center",
    elevation: 2, shadowColor: YELLO_BLUE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4,
  },
  sendButtonDisabled: { backgroundColor: "#B0C8E0", shadowOpacity: 0, elevation: 0 },
  sendIcon: { color: "#fff", fontSize: 18, marginLeft: 2 },
});
