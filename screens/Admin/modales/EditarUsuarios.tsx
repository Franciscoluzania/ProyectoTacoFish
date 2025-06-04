import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";

interface Usuario {
  id: number;
  nombre: string;
  telefono: string;
  tipo_usuario: "cliente" | "admin";
}

// screens/Admin/modales/EditarUsuarios.tsx

interface EditarUsuarioModalProps {
  visible: boolean;
  user: Usuario | null;
  onClose: () => void;
  onSave: (user: Usuario) => void;
  apiUrl: string; // Agrega esta línea
}

const EditarUsuarioModal: React.FC<EditarUsuarioModalProps> = ({
  visible,
  user,
  onClose,
  onSave,
}) => {
  const [editedUser, setEditedUser] = React.useState<Usuario | null>(null);

  React.useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
    }
  }, [user]);

  if (!editedUser) return null;

  return (
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

        <Text style={styles.title}>Editar Usuario</Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={editedUser.nombre}
            onChangeText={(text) =>
              setEditedUser({ ...editedUser, nombre: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            value={editedUser.telefono}
            onChangeText={(text) =>
              setEditedUser({ ...editedUser, telefono: text })
            }
            keyboardType="phone-pad"
          />
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() =>
                setEditedUser({ ...editedUser, tipo_usuario: "cliente" })
              }
            >
              <View style={styles.radioCircle}>
                {editedUser.tipo_usuario === "cliente" && (
                  <View style={styles.selectedRb} />
                )}
              </View>
              <Text style={styles.radioText}>Cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() =>
                setEditedUser({ ...editedUser, tipo_usuario: "admin" })
              }
            >
              <View style={styles.radioCircle}>
                {editedUser.tipo_usuario === "admin" && (
                  <View style={styles.selectedRb} />
                )}
              </View>
              <Text style={styles.radioText}>Admin</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => onSave(editedUser)}
          >
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E86C1",
    textAlign: "center",
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#D6DBDF",
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2E86C1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E86C1",
  },
  radioText: {
    fontSize: 14,
    color: "#2C3E50",
  },
  saveButton: {
    backgroundColor: "#2E86C1",
    borderRadius: 5,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});

export default EditarUsuarioModal;
