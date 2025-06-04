import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
} from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria_id: number;
}

interface PlatillosModalProps {
  visible: boolean;
  onClose: () => void;
}

const PlatillosModal: React.FC<PlatillosModalProps> = ({
  visible,
  onClose,
}) => {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [nuevoPlatillo, setNuevoPlatillo] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria_id: "",
  });

  // Función para cargar platillos (simulada)
  const cargarPlatillos = () => {
    // En una implementación real, harías una llamada API aquí
    const platillosEjemplo: Platillo[] = [
      {
        id: 1,
        nombre: "Pizza",
        descripcion: "Pizza margarita",
        precio: 12.99,
        categoria_id: 1,
      },
      {
        id: 2,
        nombre: "Hamburguesa",
        descripcion: "Hamburguesa con queso",
        precio: 8.99,
        categoria_id: 1,
      },
      {
        id: 3,
        nombre: "Ensalada",
        descripcion: "Ensalada César",
        precio: 6.99,
        categoria_id: 2,
      },
    ];
    setPlatillos(platillosEjemplo);
  };

  // Cargar platillos cuando el modal se abre
  React.useEffect(() => {
    if (visible) {
      cargarPlatillos();
    }
  }, [visible]);

  const handleAddPlatillo = () => {
    // Lógica para agregar platillo
    const nuevoId = Math.max(...platillos.map((p) => p.id), 0) + 1;
    setPlatillos([
      ...platillos,
      {
        id: nuevoId,
        nombre: nuevoPlatillo.nombre,
        descripcion: nuevoPlatillo.descripcion,
        precio: parseFloat(nuevoPlatillo.precio),
        categoria_id: parseInt(nuevoPlatillo.categoria_id),
      },
    ]);
    setNuevoPlatillo({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria_id: "",
    });
  };

  const handleDeletePlatillo = (id: number) => {
    setPlatillos(platillos.filter((p) => p.id !== id));
  };

  const renderItem = ({ item }: { item: Platillo }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.nombre}</Text>
        <Text style={styles.itemDetail}>{item.descripcion}</Text>
        <Text style={styles.itemDetail}>${item.precio.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeletePlatillo(item.id)}
      >
        <MaterialIcons name="delete" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

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

        <Text style={styles.title}>Gestión de Platillos</Text>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Agregar Nuevo Platillo</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={nuevoPlatillo.nombre}
            onChangeText={(text) =>
              setNuevoPlatillo({ ...nuevoPlatillo, nombre: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Descripción"
            value={nuevoPlatillo.descripcion}
            onChangeText={(text) =>
              setNuevoPlatillo({ ...nuevoPlatillo, descripcion: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Precio"
            value={nuevoPlatillo.precio}
            onChangeText={(text) =>
              setNuevoPlatillo({ ...nuevoPlatillo, precio: text })
            }
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="ID de Categoría"
            value={nuevoPlatillo.categoria_id}
            onChangeText={(text) =>
              setNuevoPlatillo({ ...nuevoPlatillo, categoria_id: text })
            }
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPlatillo}
          >
            <Text style={styles.addButtonText}>Agregar Platillo</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={platillos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E86C1",
    marginBottom: 15,
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
  addButton: {
    backgroundColor: "#2E86C1",
    borderRadius: 5,
    padding: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 5,
  },
  itemDetail: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 3,
  },
  actionButton: {
    borderRadius: 5,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
  },
});

export default PlatillosModal;
