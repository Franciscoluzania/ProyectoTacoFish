import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";

interface Detalle {
  platillo_id: number;
  nombre: string;
  precio?: number;
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
  estado?: string; // <-- puede ser undefined
  usuario: Usuario;
  detalles: Detalle[];
}

interface PedidosModalProps {
  visible: boolean;
  onClose: () => void;
}

const estadosPosibles = ["pendiente", "pagado", "cancelado"];

// Colores para estados
const coloresEstado: Record<string, { background: string; text: string }> = {
  pendiente: { background: "#F39C12", text: "#fff" },
  pagado: { background: "#27AE60", text: "#fff" },
  cancelado: { background: "#E74C3C", text: "#fff" },
};

const PedidosModal: React.FC<PedidosModalProps> = ({ visible, onClose }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagenVisible, setImagenVisible] = useState(false);
  const [imagenSeleccionada, setImagenSeleccionada] = useState<string | null>(
    null
  );
  const [modalConfirmVisible, setModalConfirmVisible] = useState(false);
  const [pedidoAEliminar, setPedidoAEliminar] = useState<number | null>(null);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://192.168.8.102:3000/api/pedidos");
      if (!response.ok) throw new Error("Error al cargar pedidos");
      const data: Pedido[] = await response.json();
      setPedidos(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      cargarPedidos();
    }
  }, [visible]);

  const borrarPedido = async (id: number) => {
    try {
      await axios.delete(`http://192.168.8.102:3000/api/pedidos/${id}`);
      setPedidos((p) => p.filter((pedido) => pedido.id !== id));
      setModalConfirmVisible(false);
      setPedidoAEliminar(null);
    } catch (error) {
      console.error("Error al eliminar pedido:", error);
      Alert.alert("Error", "No se pudo eliminar el pedido.");
    }
  };

  const actualizarEstado = async (id: number, nuevoEstado: string) => {
    try {
      await axios.put(`http://192.168.8.102:3000/api/pedidos/${id}/estado`, {
        estado: nuevoEstado,
      });

      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el estado.");
      console.error(error);
    }
  };

  const handleDeletePedido = (id: number) => {
    setPedidoAEliminar(id);
    setModalConfirmVisible(true);
  };

  const abrirImagen = (uri: string) => {
    setImagenSeleccionada(uri);
    setImagenVisible(true);
  };

  const cerrarImagen = () => {
    setImagenVisible(false);
    setImagenSeleccionada(null);
  };

  return (
    <>
      <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <AntDesign name="close" size={28} color="#2E86C1" />
          </TouchableOpacity>

          <Text style={styles.title}>Gestión de Pedidos</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2E86C1" />
          ) : pedidos.length === 0 ? (
            <Text style={styles.noData}>No hay pedidos disponibles</Text>
          ) : (
            <FlatList
              data={pedidos}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
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

                    <View style={styles.estadoContainer}>
                      <Text style={styles.estadoLabel}>Estado:</Text>
                      <View
                        style={[
                          styles.estadoPill,
                          {
                            backgroundColor:
                              coloresEstado[item.estado ?? ""]?.background ||
                              "#999",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.estadoText,
                            {
                              color:
                                coloresEstado[item.estado ?? ""]?.text ||
                                "#fff",
                            },
                          ]}
                        >
                          {(item.estado ?? "").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={item.estado ?? ""}
                        onValueChange={(value) =>
                          actualizarEstado(item.id, value)
                        }
                        style={
                          Platform.OS === "ios"
                            ? styles.pickerIOS
                            : styles.pickerAndroid
                        }
                        dropdownIconColor="#2E86C1"
                      >
                        {estadosPosibles.map((estado) => (
                          <Picker.Item
                            key={estado}
                            label={
                              estado.charAt(0).toUpperCase() + estado.slice(1)
                            }
                            value={estado}
                          />
                        ))}
                      </Picker>
                    </View>

                    {item.detalles.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text
                          style={[styles.itemDetail, { fontWeight: "bold" }]}
                        >
                          Detalles:
                        </Text>
                        {item.detalles.map((d) => (
                          <Text key={d.platillo_id} style={styles.itemDetail}>
                            - {d.nombre}, Cantidad: {d.cantidad}
                          </Text>
                        ))}
                      </View>
                    )}

                    {item.comprobante && (
                      <View style={{ marginTop: 12, alignItems: "center" }}>
                        <Text style={styles.itemDetail}>Comprobante:</Text>
                        <TouchableOpacity
                          onPress={() => abrirImagen(item.comprobante ?? "")}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: item.comprobante ?? "" }}
                            style={styles.comprobanteImage}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                        <Text style={styles.hintText}>
                          Toca la imagen para ampliar
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeletePedido(item.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={22} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Modal confirmación eliminación */}
      <Modal
        animationType="fade"
        transparent
        visible={modalConfirmVisible}
        onRequestClose={() => setModalConfirmVisible(false)}
      >
        <View style={styles.confirmModalBackground}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmTitle}>Confirmar eliminación</Text>
            <Text style={styles.confirmMessage}>
              ¿Seguro que quieres eliminar este pedido?
            </Text>

            <View style={styles.confirmButtonsContainer}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setModalConfirmVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={() =>
                  pedidoAEliminar !== null && borrarPedido(pedidoAEliminar)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.deleteConfirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal imagen expandida */}
      <Modal
        visible={imagenVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarImagen}
      >
        <View style={styles.modalImagenContainer}>
          <TouchableOpacity
            style={styles.cerrarImagenBtn}
            onPress={cerrarImagen}
            activeOpacity={0.8}
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
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 15,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2E86C1",
    textAlign: "center",
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34495E",
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: "#34495E",
    marginBottom: 3,
  },
  estadoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  estadoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34495E",
    marginRight: 8,
  },
  estadoPill: {
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 15,
  },
  estadoText: {
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
  },
  actionButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#E74C3C",
    alignSelf: "flex-start",
  },
  pickerWrapper: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#2980B9",
    borderRadius: 8,
    overflow: "hidden",
  },
  pickerAndroid: {
    color: "#2980B9",
  },
  pickerIOS: {
    height: 140,
    color: "#2980B9",
  },
  comprobanteImage: {
    width: width * 0.4,
    height: height * 0.2,
    borderRadius: 12,
    marginTop: 8,
  },
  hintText: {
    fontSize: 11,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginTop: 4,
    textAlign: "center",
  },

  modalImagenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  cerrarImagenBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  imagenExpandida: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 14,
  },

  // Modal confirmación eliminación
  confirmModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModalContainer: {
    backgroundColor: "white",
    width: "80%",
    borderRadius: 12,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 7,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
    color: "#E74C3C",
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 22,
    textAlign: "center",
  },
  confirmButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  confirmButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  cancelButton: {
    backgroundColor: "#bdc3c7",
  },
  cancelButtonText: {
    color: "#2c3e50",
    fontWeight: "600",
    fontSize: 15,
  },
  deleteConfirmButton: {
    backgroundColor: "#E74C3C",
  },
  deleteConfirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  noData: {
    marginTop: 40,
    fontSize: 16,
    fontStyle: "italic",
    color: "#7f8c8d",
    textAlign: "center",
  },
});

export default PedidosModal;
