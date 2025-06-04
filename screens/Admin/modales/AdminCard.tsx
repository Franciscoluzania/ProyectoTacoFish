import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";

interface AdminCardProps {
  icon: string;
  title: string;
  count: number;
  onPress: () => void;
}

const AdminCard: React.FC<AdminCardProps> = ({ icon, title, count, onPress }) => {
  const getIcon = () => {
    switch (icon) {
      case "users":
        return <FontAwesome name="users" size={30} color="#2E86C1" />;
      case "restaurant":
        return <MaterialIcons name="restaurant" size={30} color="#2E86C1" />;
      case "receipt":
        return <MaterialIcons name="receipt" size={30} color="#2E86C1" />;
      default:
        return <FontAwesome name="question" size={30} color="#2E86C1" />;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardIcon}>{getIcon()}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardCount}>{count} registrados</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  cardIcon: {
    backgroundColor: "#EAF2F8",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E86C1",
    marginBottom: 5,
  },
  cardCount: {
    fontSize: 14,
    color: "#7F8C8D",
  },
});

export default AdminCard;