import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Menu from "../screens/Menu";
import Carrito from "../screens/Carrito";
import { useCarrito } from "../context/CarritoContext";
import { Text, View } from "react-native";

const Tab = createBottomTabNavigator();

const AppNavigation = () => {
  const { carrito } = useCarrito();
  const cantidadTotal = carrito.reduce((sum, item) => sum + (item.cantidad || 1), 0);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = "home";

            if (route.name === "Menú") {
              iconName = "restaurant";
            } else if (route.name === "Carrito") {
              iconName = "cart";
            }

            return (
              <>
                <Ionicons name={iconName} size={size} color={color} />
                {route.name === "Carrito" && cantidadTotal > 0 && (
                  <Badge count={cantidadTotal} />
                )}
              </>
            );
          },
          tabBarActiveTintColor: "#ff6347",
          tabBarInactiveTintColor: "gray",
        })}
      >
        <Tab.Screen name="Menú" component={Menu} />
        <Tab.Screen name="Carrito" component={Carrito} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// 👇 Este es un componente auxiliar para mostrar el número sobre el ícono
const Badge = ({ count }: { count: number }) => (
  <View
    style={{
      position: "absolute",
      right: -6,
      top: -3,
      backgroundColor: "red",
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 16,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
<Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>{count}</Text>
  </View>
);

export default AppNavigation;
