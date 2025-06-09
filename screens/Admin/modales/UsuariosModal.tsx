import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
} from "react-native";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";

interface Usuario {
  id: number;
  nombre: string;
  telefono: string;
  tipo_usuario: string;
  fecha_registro?: string;
}

interface UsuariosModalProps {
  visible: boolean;
  onClose: () => void;
  apiUrl: string;
}

const UsuariosModal: React.FC<UsuariosModalProps> = ({
  visible,
  onClose,
  apiUrl,
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);

  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);

  const [editUserVisible, setEditUserVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editTipoUsuario, setEditTipoUsuario] = useState<"admin" | "cliente">(
    "cliente"
  );
  const [editContrasena, setEditContrasena] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [addUserVisible, setAddUserVisible] = useState(false);
  const [addNombre, setAddNombre] = useState("");
  const [addTelefono, setAddTelefono] = useState("");
  const [addTipoUsuario, setAddTipoUsuario] = useState<"admin" | "cliente">(
    "cliente"
  );
  const [addContrasena, setAddContrasena] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await axios.get<Usuario[]>(`${apiUrl}/api/usuarios`);
      setUsuarios(response.data);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) cargarUsuarios();
  }, [visible]);

  const confirmarEliminar = (usuario: Usuario) => {
    setUsuarioEliminar(usuario);
    setConfirmDeleteVisible(true);
  };

  const eliminarUsuario = async () => {
    if (!usuarioEliminar) return;
    setLoading(true);
    try {
      await axios.delete(`${apiUrl}/api/usuarios/${usuarioEliminar.id}`);
      await cargarUsuarios();
      setConfirmDeleteVisible(false);
      setUsuarioEliminar(null);
    } catch (error) {
      Alert.alert("Error", "Error al eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const abrirEditarUsuario = (usuario: Usuario) => {
    setUserToEdit(usuario);
    setEditNombre(usuario.nombre);
    setEditTelefono(usuario.telefono);
    setEditTipoUsuario(usuario.tipo_usuario === "admin" ? "admin" : "cliente");
    setEditContrasena("");
    setEditUserVisible(true);
  };

  const guardarEdicion = async () => {
    if (!editNombre || !editTelefono || !editTipoUsuario) {
      Alert.alert("Error", "Completa todos los campos obligatorios.");
      return;
    }

    setEditLoading(true);
    try {
      await axios.put(`${apiUrl}/api/usuarios/${userToEdit?.id}`, {
        nombre: editNombre,
        telefono: editTelefono,
        tipo_usuario: editTipoUsuario,
        contraseña: editContrasena.trim() === "" ? undefined : editContrasena,
      });
      Alert.alert("Éxito", "Usuario actualizado correctamente");
      setEditUserVisible(false);
      await cargarUsuarios();
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el usuario");
    } finally {
      setEditLoading(false);
    }
  };

  const agregarUsuario = async () => {
    if (!addNombre || !addTelefono || !addContrasena) {
      Alert.alert("Error", "Completa todos los campos obligatorios.");
      return;
    }

    let telefonoConPrefijo = addTelefono.trim();
    if (!telefonoConPrefijo.startsWith("+52")) {
      telefonoConPrefijo = "+52" + telefonoConPrefijo;
    }

    setAddLoading(true);
    try {
      await axios.post(`${apiUrl}/api/usuarios`, {
        nombre: addNombre,
        telefono: telefonoConPrefijo,
        tipo_usuario: addTipoUsuario,
        contraseña: addContrasena,
      });

      // Limpiar campos ANTES de cerrar modal para evitar mostrar datos antiguos
      setAddNombre("");
      setAddTelefono("");
      setAddTipoUsuario("cliente");
      setAddContrasena("");

      // Esperar que cargue la lista actualizada ANTES de cerrar modal
      await cargarUsuarios();

      setAddUserVisible(false);
      Alert.alert("Éxito", "Usuario agregado correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudo agregar el usuario");
    } finally {
      setAddLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Usuario }) => (
    <View style={styles.item}>
      <View style={styles.userInfo}>
        <Text style={styles.itemText}>{item.nombre}</Text>
        <Text style={styles.itemSubText}>
          Tel: {item.telefono} | Tipo: {item.tipo_usuario}
        </Text>
        {item.fecha_registro && (
          <Text style={styles.itemSubTextSmall}>
            Registrado: {new Date(item.fecha_registro).toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => abrirEditarUsuario(item)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => confirmarEliminar(item)}
        >
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {/* Modal principal */}
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Lista de Usuarios</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : usuarios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios registrados.</Text>
            </View>
          ) : (
            <FlatList
              data={usuarios}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#28a745" }]}
            onPress={() => setAddUserVisible(true)}
          >
            <Text style={styles.buttonText}>Agregar Usuario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal confirmación de eliminación */}
      <Modal visible={confirmDeleteVisible} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmTitle}>Confirmar eliminación</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro que deseas eliminar al usuario{" "}
              <Text style={{ fontWeight: "bold" }}>
                {usuarioEliminar?.nombre}
              </Text>
              ?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.confirmButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={eliminarUsuario}
              >
                <Text style={styles.confirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal edición */}
      <Modal visible={editUserVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Editar Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={editNombre}
            onChangeText={setEditNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={editTelefono}
            onChangeText={setEditTelefono}
            keyboardType="phone-pad"
          />
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={editTipoUsuario}
              onValueChange={setEditTipoUsuario}
            >
              <Picker.Item label="Cliente" value="cliente" />
              <Picker.Item label="Administrador" value="admin" />
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Contraseña (vacío para no cambiar)"
            value={editContrasena}
            onChangeText={setEditContrasena}
            secureTextEntry
          />
          {editLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={guardarEdicion}>
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditUserVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Modal agregar */}
      <Modal visible={addUserVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Agregar Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={addNombre}
            onChangeText={setAddNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={addTelefono}
            onChangeText={setAddTelefono}
            keyboardType="phone-pad"
          />
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={addTipoUsuario}
              onValueChange={setAddTipoUsuario}
            >
              <Picker.Item label="Cliente" value="cliente" />
              <Picker.Item label="Administrador" value="admin" />
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={addContrasena}
            onChangeText={setAddContrasena}
            secureTextEntry
          />
          {addLoading ? (
            <ActivityIndicator size="large" color="#28a745" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#28a745" }]}
                onPress={agregarUsuario}
              >
                <Text style={styles.buttonText}>Agregar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setAddNombre("");
                  setAddTelefono("");
                  setAddTipoUsuario("cliente");
                  setAddContrasena("");
                  setAddUserVisible(false);
                  setAddLoading(false);
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  itemSubText: {
    color: "#666",
  },
  itemSubTextSmall: {
    color: "#999",
    fontSize: 12,
  },
  buttonsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: "#007bff",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginVertical: 8,
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginVertical: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmContainer: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 10,
    width: "80%",
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  confirmButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelConfirmButton: {
    backgroundColor: "#6c757d",
  },
  deleteConfirmButton: {
    backgroundColor: "#dc3545",
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
});

export default UsuariosModal;
