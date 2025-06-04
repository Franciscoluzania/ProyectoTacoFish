import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";

interface Usuario {
  id: number;
  nombre: string;
  contraseña?: string;
  telefono: string;
  tipo_usuario: "cliente" | "admin";
}

interface UsuariosModalProps {
  visible: boolean;
  onClose: () => void;
  apiUrl?: string;
  onEditUser?: (user: Usuario) => void;
}

const UsuariosModal: React.FC<UsuariosModalProps> = ({
  visible,
  onClose,
  apiUrl = "http://192.168.56.1:3000",
}) => {
  const [searchText, setSearchText] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [nuevoUsuario, setNuevoUsuario] = useState<Omit<Usuario, "id">>({
    nombre: "",
    contraseña: "",
    telefono: "",
    tipo_usuario: "cliente",
  });
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);

  const cargarUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/usuarios`);
      setUsuarios(response.data);
      setFilteredUsuarios(response.data);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los usuarios");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  const filtrarUsuarios = useCallback(
    (text: string) => {
      if (text === "") {
        setFilteredUsuarios(usuarios);
      } else {
        const filtered = usuarios.filter(
          (usuario) =>
            usuario.nombre.toLowerCase().includes(text.toLowerCase()) ||
            usuario.telefono.includes(text)
        );
        setFilteredUsuarios(filtered);
      }
    },
    [usuarios]
  );

  useEffect(() => {
    if (visible) {
      cargarUsuarios();
      limpiarFormulario();
    }
  }, [visible, cargarUsuarios]);

  useEffect(() => {
    filtrarUsuarios(searchText);
  }, [searchText, filtrarUsuarios]);

  const limpiarFormulario = () => {
    setNuevoUsuario({
      nombre: "",
      contraseña: "",
      telefono: "",
      tipo_usuario: "cliente",
    });
    setUsuarioEditando(null);
  };

  const handleAddOrEditUsuario = async () => {
    if (
      !nuevoUsuario.nombre.trim() ||
      !nuevoUsuario.telefono.trim() ||
      (!usuarioEditando && !nuevoUsuario.contraseña?.trim())
    ) {
      Alert.alert("Error", "Por favor complete todos los campos");
      return;
    }

    setIsAddingOrEditing(true);

    try {
      if (usuarioEditando) {
        // Construir payload que solo incluye contraseña si fue modificada
        const payload: Partial<Omit<Usuario, "id">> = {
          nombre: nuevoUsuario.nombre,
          telefono: nuevoUsuario.telefono,
          tipo_usuario: nuevoUsuario.tipo_usuario,
        };
        if (nuevoUsuario.contraseña && nuevoUsuario.contraseña.trim() !== "") {
          payload.contraseña = nuevoUsuario.contraseña;
        }

        await axios.put(`${apiUrl}/usuarios/${usuarioEditando.id}`, payload);
        Alert.alert("Éxito", "Usuario actualizado correctamente");
      } else {
        // Crear nuevo usuario
        await axios.post(`${apiUrl}/usuarios`, nuevoUsuario);
        Alert.alert("Éxito", "Usuario creado correctamente");
      }
      await cargarUsuarios();
      limpiarFormulario();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el usuario");
    } finally {
      setIsAddingOrEditing(false);
    }
  };

  const confirmDelete = (usuario: Usuario) => {
    setUsuarioAEliminar(usuario);
    setConfirmVisible(true);
  };

  const handleDeleteUsuario = async () => {
    if (!usuarioAEliminar) return;

    const id = usuarioAEliminar.id;
    setIsDeleting(id);
    setConfirmVisible(false);

    try {
      const response = await axios.delete(`${apiUrl}/usuarios/${id}`);

      if (response.data.affectedRows === 0) {
        Alert.alert("Error", "Usuario no encontrado en la base de datos");
        return;
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      setFilteredUsuarios((prev) => prev.filter((u) => u.id !== id));

      Alert.alert("Éxito", "Usuario eliminado correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar el usuario");
    } finally {
      setIsDeleting(null);
      setUsuarioAEliminar(null);
    }
  };

  const handleEditUser = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setNuevoUsuario({
      nombre: usuario.nombre,
      contraseña: "", // Vacío para que el usuario ponga nueva si quiere
      telefono: usuario.telefono,
      tipo_usuario: usuario.tipo_usuario,
    });
  };

  const renderItem = ({ item }: { item: Usuario }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.nombre}</Text>
        <Text style={styles.itemDetail}>Tel: {item.telefono}</Text>
        <Text
          style={[
            styles.itemDetail,
            item.tipo_usuario === "admin"
              ? styles.adminText
              : styles.clienteText,
          ]}
        >
          {item.tipo_usuario === "admin" ? "Administrador" : "Cliente"}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditUser(item)}
        >
          <MaterialIcons name="edit" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => confirmDelete(item)}
          disabled={isDeleting === item.id}
        >
          {isDeleting === item.id ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <MaterialIcons name="delete" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={24} color="#2E86C1" />
          </TouchableOpacity>

          <Text style={styles.title}>Gestión de Usuarios</Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuarios..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              {usuarioEditando ? "Editar Usuario" : "Agregar Nuevo Usuario"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={nuevoUsuario.nombre}
              onChangeText={(text) =>
                setNuevoUsuario({ ...nuevoUsuario, nombre: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              secureTextEntry
              value={nuevoUsuario.contraseña}
              onChangeText={(text) =>
                setNuevoUsuario({ ...nuevoUsuario, contraseña: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              value={nuevoUsuario.telefono}
              onChangeText={(text) =>
                setNuevoUsuario({ ...nuevoUsuario, telefono: text })
              }
              keyboardType="phone-pad"
            />
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() =>
                  setNuevoUsuario({ ...nuevoUsuario, tipo_usuario: "cliente" })
                }
              >
                <View style={styles.radioCircle}>
                  {nuevoUsuario.tipo_usuario === "cliente" && (
                    <View style={styles.selectedRb} />
                  )}
                </View>
                <Text style={styles.radioText}>Cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() =>
                  setNuevoUsuario({ ...nuevoUsuario, tipo_usuario: "admin" })
                }
              >
                <View style={styles.radioCircle}>
                  {nuevoUsuario.tipo_usuario === "admin" && (
                    <View style={styles.selectedRb} />
                  )}
                </View>
                <Text style={styles.radioText}>Administrador</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddOrEditUsuario}
              disabled={isAddingOrEditing}
            >
              {isAddingOrEditing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {usuarioEditando ? "Guardar Cambios" : "Agregar Usuario"}
                </Text>
              )}
            </TouchableOpacity>
            {usuarioEditando && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={limpiarFormulario}
              >
                <Text style={styles.cancelButtonText}>Cancelar Edición</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.listContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#2E86C1" />
            ) : (
              <FlatList
                data={filteredUsuarios}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmación bonita para eliminar */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Confirmar eliminación</Text>
            <Text style={styles.confirmMessage}>
              ¿Está seguro que desea eliminar al usuario{" "}
              <Text style={{ fontWeight: "bold" }}>
                {usuarioAEliminar?.nombre}
              </Text>
              ?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.confirmBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.deleteBtn]}
                onPress={handleDeleteUsuario}
              >
                <Text style={[styles.confirmBtnText, { color: "white" }]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f0f4f7",
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2E86C1",
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#34495e",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#2E86C1",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E86C1",
  },
  radioText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#34495e",
  },
  saveButton: {
    backgroundColor: "#2E86C1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#bdc3c7",
  },
  cancelButtonText: {
    color: "#34495e",
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
    color: "#2c3e50",
  },
  itemDetail: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  adminText: {
    color: "#c0392b",
  },
  clienteText: {
    color: "#27ae60",
  },
  itemActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#2980b9",
  },
  deleteButton: {
    backgroundColor: "#c0392b",
  },
  emptyText: {
    textAlign: "center",
    color: "#95a5a6",
    fontSize: 16,
    marginTop: 20,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmBox: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#e74c3c",
  },
  confirmMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#34495e",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#bdc3c7",
  },
  deleteBtn: {
    backgroundColor: "#e74c3c",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
});

export default UsuariosModal;
