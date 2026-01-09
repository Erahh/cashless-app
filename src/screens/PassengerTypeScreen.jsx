import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { savePassengerProfile } from "../api/passengerLocal";

export default function PassengerTypeScreen({ navigation }) {
  const [type, setType] = useState("casual");
  const [school, setSchool] = useState("");

  const select = (t) => setType(t);

  const handleNext = async () => {
    if (type === "student" && !school.trim()) {
      return Alert.alert("Required", "School name is required for student.");
    }

    await savePassengerProfile({
      passenger_type: type,
      school_name: type === "student" ? school.trim() : null,
    });

    if (type === "casual") {
      // no discount steps
      return navigation.navigate("Home");
    }

    // student/senior → go to discount verification info screen
    navigation.navigate("DiscountInfo", { passenger_type: type });
  };

  const Card = ({ value, label }) => (
    <TouchableOpacity
      onPress={() => select(value)}
      style={{
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        marginTop: 12,
        backgroundColor: type === value ? "#eaeaea" : "transparent",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "600" }}>{label}</Text>
      <Text style={{ marginTop: 4, color: "#555" }}>
        {value === "casual" ? "Regular fare" : "Needs verification for discount"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Passenger Type</Text>
      <Text style={{ marginTop: 8 }}>Choose your passenger category.</Text>

      <Card value="casual" label="Casual Commuter" />
      <Card value="student" label="Student" />
      <Card value="senior" label="Senior Citizen" />

      {type === "student" && (
        <>
          <Text style={{ marginTop: 16 }}>School Name</Text>
          <TextInput
            value={school}
            onChangeText={setSchool}
            style={{ borderWidth: 1, padding: 12, marginTop: 8, borderRadius: 8 }}
          />
        </>
      )}

      <View style={{ marginTop: 20 }}>
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  );
}
