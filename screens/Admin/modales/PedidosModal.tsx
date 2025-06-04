import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";

interface Pedido {
  id: number;
  usuario_id: number;
  estado: string;
  fecha: string;
  total: number;
}

interface PedidosModalProps {
  visible: boolean;
  onClose: () => void;
}

const PedidosModal: React.FC<PedidosModalProps> = ({ visible, onClose }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  // Función para cargar pedidos (simulada)
  const cargarPedidos = () => {
    // En una implementación real, harías una llamada API aquí
    const pedidosEjemplo: Pedido[] = [
      { id: 1, usuario_id: 1, estado: "pendiente", fecha: "2023-05-01", total: 25.99 },
      { id: 2, usuario_id: 2, estado: "completado", fecha: "2023-05-02", total: 18.50 },
      { id: 3, usuario_id: 1, estado: "cancelado", fecha: "2023-05-03", total: 12.75 },
    ];
    setPedidos(pedidosEjemplo);
  };

  // Cargar pedidos cuando el modal se abre
  React.useEffect(() => {
    if (visible) {
      cargarPedidos();
    }
  }, [visible]);

  const handleDeletePedido = (id: number) => {
    setPedidos(pedidos.filter(p => p.id !== id));
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente": return "#F39C12";
      case "completado": return "#27AE60";
      case "cancelado": return "#E74C3C";
      default: return "#7F8C8D";
    }
  };

  const renderItem = ({ item }: { item: Pedido }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>Pedido #{item.id}</Text>
        <Text style={styles.itemDetail}>Usuario: {item.usuario_id}</Text>
        <Text style={[styles.itemDetail, { color: getEstadoColor(item.estado) }]}>
          Estado: {item.estado}
        </Text>
        <Text style={styles.itemDetail}>Total: ${item.total.toFixed(2)}</Text>
        <Text style={styles.itemDetail}>Fecha: {item.fecha}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.deleteButton]}
        onPress={() => handleDeletePedido(item.id)}
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

        <Text style={styles.title}>Gestión de Pedidos</Text>

        <FlatList
          data={pedidos}
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

export default PedidosModal;