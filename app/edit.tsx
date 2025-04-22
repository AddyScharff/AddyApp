import { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Doc, Id } from "../convex/_generated/dataModel";

// Define activity type with proper typing
interface ActivityType {
  type: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// List of activity types with their icons and colors
const activityTypes: ActivityType[] = [
  { type: "Work", icon: "briefcase-outline", color: "#3700b3" },
  { type: "Meeting", icon: "people-outline", color: "#018786" },
  { type: "Exercise", icon: "fitness-outline", color: "#03dac6" },
  { type: "Study", icon: "book-outline", color: "#bb86fc" },
  { type: "Meal", icon: "restaurant-outline", color: "#ff7597" },
  { type: "Leisure", icon: "game-controller-outline", color: "#ffb300" },
  { type: "Other", icon: "calendar-outline", color: "#6200ee" },
];

export default function EditActivity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const activityId = params.id as Id<"activities">;

  const activity = useQuery(api.activities.getById, { id: activityId });
  const updateActivity = useMutation(api.activities.update);

  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load activity data when available
  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setSelectedType(activity.type);
      setStartDate(new Date(activity.startTime));
      setEndDate(new Date(activity.endTime));
      setIsLoading(false);
    }
  }, [activity]);

  const handleUpdateActivity = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter an activity name");
      return;
    }

    try {
      await updateActivity({
        id: activityId,
        name: name.trim(),
        type: selectedType,
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
      });
      
      // Navigate back without showing the success message
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update activity. Please try again.");
      console.error("Error updating activity:", error);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Activity</Text>
          <View style={{ width: 24 }}></View>
        </View>

        <View style={styles.formContainer}>
          {/* Activity Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Activity Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter activity name"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Activity Type Selector */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Activity Type</Text>
            <View style={styles.typeContainer}>
              {activityTypes.map((activity) => (
                <TouchableOpacity
                  key={activity.type}
                  style={[
                    styles.typeButton,
                    selectedType === activity.type && {
                      backgroundColor: `${activity.color}20`,
                      borderColor: activity.color,
                    },
                  ]}
                  onPress={() => setSelectedType(activity.type)}
                >
                  <Ionicons
                    name={activity.icon}
                    size={20}
                    color={selectedType === activity.type ? activity.color : "#666"}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      selectedType === activity.type && {
                        color: activity.color,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {activity.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Selectors */}
          <View style={styles.timeRow}>
            {/* Start Time */}
            <View style={styles.timeContainer}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#6200ee" />
                <Text style={styles.timeText}>{formatTime(startDate)}</Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      // If end time is earlier than start time, adjust it
                      if (selectedDate > endDate) {
                        const newEndDate = new Date(selectedDate);
                        newEndDate.setHours(selectedDate.getHours() + 1);
                        setEndDate(newEndDate);
                      }
                    }
                  }}
                />
              )}
            </View>

            {/* End Time */}
            <View style={styles.timeContainer}>
              <Text style={styles.inputLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#6200ee" />
                <Text style={styles.timeText}>{formatTime(endDate)}</Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateActivity}
          >
            <Text style={styles.updateButtonText}>Update Activity</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  typeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  timeContainer: {
    width: "48%",
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  timeText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  updateButton: {
    backgroundColor: "#6200ee",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});