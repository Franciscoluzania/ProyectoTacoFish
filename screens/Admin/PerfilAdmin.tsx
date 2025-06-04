import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import UsuariosModal from "@/screens/Admin/modales/UsuariosModal";
import PlatillosModal from "@/screens/Admin/modales/PlatillosModal";
import PedidosModal from "@/screens/Admin/modales/PedidosModal";
import LogoutModal from "@/screens/Admin/modales/LogoutModal";
import EditarUsuarioModal from "@/screens/Admin/modales/EditarUsuarios";
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
  const [modalEditarUsuario, setModalEditarUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPlatillos, setTotalPlatillos] = useState(0);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { logout } = useAuth();
  const apiUrl = "http://192.168.56.1:3000";

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
      const [usuariosResponse, platillosResponse] = await Promise.all([
        axios.get<Usuario[]>(`${apiUrl}/usuarios`),
        axios.get(`${apiUrl}/platillos`),
      ]);

      setTotalUsuarios(usuariosResponse.data.length);
      setTotalPlatillos(platillosResponse.data.length);
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
          count={0}
          onPress={() => setModalPedidos(true)}
        />

        <LogoutButton onPress={() => setModalLogout(true)} />
      </ScrollView>

      <UsuariosModal
        visible={modalUsuarios}
        onClose={() => {
          setModalUsuarios(false);
          fetchConteos(); // Actualizar conteo después de cerrar modal
        }}
        onEditUser={(user: Usuario) => {
          setUsuarioEditando(user);
          setModalEditarUsuario(true);
        }}
        apiUrl={apiUrl}
      />

      <PlatillosModal
        visible={modalPlatillos}
        onClose={() => {
          setModalPlatillos(false);
          fetchConteos(); // Actualizar conteo después de cerrar modal
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

      <EditarUsuarioModal
        visible={modalEditarUsuario}
        user={usuarioEditando}
        onClose={() => setModalEditarUsuario(false)}
        onSave={() => {
          setModalEditarUsuario(false);
          fetchConteos(); // Refrescar usuarios si se editó
        }}
        apiUrl={apiUrl}
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
});

export default PerfilAdmin;
