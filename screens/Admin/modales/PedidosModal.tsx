import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";

interface Detalle {
  platillo_id: number;
  cantidad: number;
}

interface Usuario {
  id?: number;
  nombre?: string;
  anonimo?: boolean;
  identificador?: string;
}

interface Pedido {
  id: number;
  metodo_pago: string;
  total: number | string;
  fecha?: string;
  comprobante: string | null;
  usuario: Usuario;
  detalles: Detalle[];
}

interface PedidosModalProps {
  visible: boolean;
  onClose: () => void;
}

const PedidosModal: React.FC<PedidosModalProps> = ({ visible, onClose }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagenVisible, setImagenVisible] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(
    null
  );

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://192.168.8.102:3000/api/pedidos");
      if (!response.ok) throw new Error("Error al cargar pedidos");
      const data: Pedido[] = await response.json();
      setPedidos(data);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar los pedidos.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      cargarPedidos();
    }
  }, [visible]);

  const handleDeletePedido = (id: number) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Seguro que quieres eliminar este pedido localmente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () =>
            setPedidos((p) => p.filter((pedido) => pedido.id !== id)),
        },
      ]
    );
  };

  // Abrir modal de imagen con la imagen seleccionada
  const abrirImagen = (uri: string) => {
    setImagenSeleccionada(uri);
    setImagenVisible(true);
  };

  // Cerrar modal de imagen
  const cerrarImagen = () => {
    setImagenVisible(false);
    setImagenSeleccionada(null);
  };

  const renderItem = ({ item }: { item: Pedido }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>Pedido #{item.id}</Text>
        <Text style={styles.itemDetail}>
          Usuario:{" "}
          {item.usuario.anonimo
            ? `Anónimo (${item.usuario.identificador || "sin id"})`
            : item.usuario.nombre || "Desconocido"}
        </Text>
        <Text style={styles.itemDetail}>
          Método de pago: {item.metodo_pago}
        </Text>
        <Text style={styles.itemDetail}>
          Total: ${parseFloat(String(item.total)).toFixed(2)}
        </Text>

        {item.fecha && (
          <Text style={styles.itemDetail}>
            Fecha: {new Date(item.fecha).toLocaleString()}
          </Text>
        )}

        {item.detalles.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.itemDetail, { fontWeight: "bold" }]}>
              Detalles:
            </Text>
            {item.detalles.map((d) => (
              <Text key={d.platillo_id} style={styles.itemDetail}>
                - Platillo ID: {d.platillo_id}, Cantidad: {d.cantidad}
              </Text>
            ))}
          </View>
        )}

        {item.comprobante && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.itemDetail}>Comprobante:</Text>
            <TouchableOpacity
              onPress={() => abrirImagen(item.comprobante ?? "")}
            >
              <Image
                source={{ uri: item.comprobante ?? "" }}
                style={{ width: 200, height: 200, borderRadius: 8 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <Text style={{ color: "#2E86C1", marginTop: 5, fontSize: 12 }}>
              Toca la imagen para ampliar
            </Text>
          </View>
        )}
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

          <Text style={styles.title}>Gestión de Pedidos</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2E86C1" />
          ) : pedidos.length === 0 ? (
            <Text
              style={{ textAlign: "center", marginTop: 20, color: "#7F8C8D" }}
            >
              No hay pedidos disponibles
            </Text>
          ) : (
            <FlatList
              data={pedidos}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </Modal>

      {/* Modal para imagen expandida */}
      <Modal
        visible={imagenVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cerrarImagen}
      >
        <View style={styles.modalImagenContainer}>
          <TouchableOpacity
            style={styles.cerrarImagenBtn}
            onPress={cerrarImagen}
          >
            <AntDesign name="closecircle" size={36} color="white" />
          </TouchableOpacity>
          {imagenSeleccionada && (
            <Image
              source={{ uri: imagenSeleccionada }}
              style={styles.imagenExpandida}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const { width, height } = Dimensions.get("window");

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
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
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
  modalImagenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagenExpandida: {
    width: width * 0.9,
    height: height * 0.75,
    borderRadius: 10,
  },
  cerrarImagenBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
});

export default PedidosModal;
