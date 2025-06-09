import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert, Text } from "react-native";
import UsuariosModal from "./modales/UsuariosModal";
import PlatillosModal from "@/screens/Admin/modales/PlatillosModal";
import PedidosModal from "@/screens/Admin/modales/PedidosModal";
import LogoutModal from "@/screens/Admin/modales/LogoutModal";
import AdminCard from "@/screens/Admin/modales/AdminCard";
import LogoutButton from "@/screens/Admin/modales/LogoutButton";
import { useAuth } from "@/context/AuthContext";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface Usuario {
  id: number;
  nombre: string;
  contraseña?: string;
  telefono: string;
  tipo_usuario: "cliente" | "admin";
}

interface PerfilAdminProps {
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

const PerfilAdmin: React.FC<PerfilAdminProps> = ({ setIsLoggedIn }) => {
  const [modalUsuarios, setModalUsuarios] = useState(false);
  const [modalPlatillos, setModalPlatillos] = useState(false);
  const [modalPedidos, setModalPedidos] = useState(false);
  const [modalLogout, setModalLogout] = useState(false);

  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPlatillos, setTotalPlatillos] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { logout, user } = useAuth();  // <-- obtengo user del contexto
  const apiUrl = "http://192.168.8.102:3000";

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar sesión.");
    }
  };

  const fetchConteos = useCallback(async () => {
    try {
      const [usuariosRes, platillosRes, pedidosRes] = await Promise.all([
        axios.get<Usuario[]>(`${apiUrl}/api/usuarios`),
        axios.get(`${apiUrl}/platillos`),
        axios.get(`${apiUrl}/api/pedidos`),
      ]);

      setTotalUsuarios(usuariosRes.data.length);
      setTotalPlatillos(platillosRes.data.length);
      setTotalPedidos(
        Array.isArray(pedidosRes.data) ? pedidosRes.data.length : 0
      );
    } catch (error) {
      console.error("Error al cargar conteos:", error);
      Alert.alert("Error", "No se pudieron cargar los conteos.");
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchConteos();
  }, [fetchConteos]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {user?.nombre ? (
          <Text style={styles.adminName}>Bienvenido, {user.nombre}</Text>
        ) : null}

        <AdminCard
          icon="users"
          title="Usuarios"
          count={totalUsuarios}
          onPress={() => setModalUsuarios(true)}
        />
        <AdminCard
          icon="restaurant"
          title="Platillos"
          count={totalPlatillos}
          onPress={() => setModalPlatillos(true)}
        />
        <AdminCard
          icon="receipt"
          title="Pedidos"
          count={totalPedidos}
          onPress={() => setModalPedidos(true)}
        />
        <LogoutButton onPress={() => setModalLogout(true)} />
      </ScrollView>

      <UsuariosModal
        visible={modalUsuarios}
        onClose={() => {
          setModalUsuarios(false);
          fetchConteos();
        }}
        apiUrl={apiUrl}
      />

      <PlatillosModal
        visible={modalPlatillos}
        onClose={() => {
          setModalPlatillos(false);
          fetchConteos();
        }}
      />

      <PedidosModal
        visible={modalPedidos}
        onClose={() => setModalPedidos(false)}
      />

      <LogoutModal
        visible={modalLogout}
        onClose={() => setModalLogout(false)}
        onLogout={handleLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  adminName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
});

export default PerfilAdmin;
