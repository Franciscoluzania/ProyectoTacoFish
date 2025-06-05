import React, { useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useCarrito } from "../context/CarritoContext";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "@/context/AuthContext";

const Carrito = () => {
  const {
    carrito,
    quitarDelCarrito,
    limpiarCarrito,
    incrementarCantidad,
    decrementarCantidad,
  } = useCarrito();

  const { user } = useContext(AuthContext);

  // Para simular cliente anónimo si no hay usuario logueado (opcional)
  // Puedes reemplazar este string por algo dinámico si quieres
  const clienteAnonimo = !user ? "anonimo-" + Date.now() : null;

  const total = carrito.reduce(
    (sum, item) => sum + item.precio * (item.cantidad || 1),
    0
  );

  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"transferencia" | "local" | null>(null);
  const [comprobanteBase64, setComprobanteBase64] = useState<string | null>(null);
  const [comprobanteMime, setComprobanteMime] = useState<string | null>(null);
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [isProcesandoPago, setIsProcesandoPago] = useState(false);
  const [exitoVisible, setExitoVisible] = useState(false);

  const abrirModalPago = () => {
    setMetodoPago(null);
    setComprobanteBase64(null);
    setComprobanteMime(null);
    setComprobanteUri(null);
    setModalPagoVisible(true);
  };

  const cerrarModalPago = () => {
    if (isProcesandoPago) return;
    setModalPagoVisible(false);
  };

  const getMimeFromUri = (uri: string) => {
    const extension = uri.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "heic":
        return Platform.OS === "ios" ? "image/heic" : "image/jpeg";
      case "webp":
        return "image/webp";
      default:
        return "image/jpeg";
    }
  };

  const seleccionarImagen = async () => {
    try {
      const permisoResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permisoResult.status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitas permitir acceso a la galería.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const base64 = asset.base64;
        const uri = asset.uri;

        if (!base64 || !uri) {
          Alert.alert("Error", "No se pudo obtener la imagen.");
          return;
        }

        const mimeType = getMimeFromUri(uri);
        setComprobanteBase64(base64);
        setComprobanteMime(mimeType);
        setComprobanteUri(uri);
      }
    } catch (error) {
      console.error("❌ Error seleccionando imagen:", error);
      Alert.alert("Error", "Ocurrió un error al seleccionar la imagen.");
    }
  };

  const enviarPedido = async () => {
    if (!metodoPago) {
      Alert.alert("Error", "Selecciona un método de pago");
      return;
    }

    if (metodoPago === "transferencia" && !comprobanteBase64) {
      Alert.alert("Error", "Debes subir la foto del comprobante de transferencia");
      return;
    }

    // Validar user o cliente anonimo
    if (!user?.id && !clienteAnonimo) {
      Alert.alert("Error", "No se ha identificado al usuario ni cliente anónimo.");
      return;
    }

    setIsProcesandoPago(true);

    try {
      const payload = {
        carrito: carrito.map(({ id, cantidad }) => ({ id, cantidad: cantidad || 1 })),
        total,
        metodo_pago: metodoPago,
        comprobanteBase64,
        comprobanteMime,
        user_id: user?.id || null,
        cliente_anonimo: user ? null : clienteAnonimo,
      };

      const response = await axios.post("http://192.168.8.102:3000/api/pedidos", payload);

      if (response.status === 201) {
        setExitoVisible(true);
        limpiarCarrito();
        setModalPagoVisible(false);
        setTimeout(() => setExitoVisible(false), 2000);
      } else {
        Alert.alert("Error", "No se pudo procesar el pedido.");
      }
    } catch (error) {
      console.error("❌ Error enviando pedido:", error);
      Alert.alert("Error", "Ocurrió un error al enviar el pedido.");
    } finally {
      setIsProcesandoPago(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.itemContainer}>
      {item.imagen && <Image source={item.imagen} style={styles.imagen} />}
      <View style={styles.infoContainer}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        <View style={styles.cantidadContainer}>
          <TouchableOpacity style={styles.botonCantidad} onPress={() => decrementarCantidad(item.id)}>
            <Text style={styles.textoBotonCantidad}>-</Text>
          </TouchableOpacity>
          <Text style={styles.cantidadTexto}>{item.cantidad || 1}</Text>
          <TouchableOpacity style={styles.botonCantidad} onPress={() => incrementarCantidad(item.id)}>
            <Text style={styles.textoBotonCantidad}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.precio}>
          ${Number(item.precio).toFixed(2)} c/u | Total: ${(item.precio * (item.cantidad || 1)).toFixed(2)}
        </Text>
        <TouchableOpacity style={styles.botonQuitar} onPress={() => quitarDelCarrito(item.id)}>
          <Text style={styles.textoBoton}>Quitar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Carrito</Text>

      {carrito.length === 0 ? (
        <Text style={styles.vacio}>Tu carrito está vacío</Text>
      ) : (
        <FlatList
          data={carrito}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalTexto}>Total: ${total.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[styles.botonPagar, carrito.length === 0 && { backgroundColor: "#94d3a2" }]}
        onPress={abrirModalPago}
        disabled={carrito.length === 0}
      >
        <Text style={styles.textoBotonPagar}>Pagar</Text>
      </TouchableOpacity>

      {/* Modal de pago */}
      <Modal animationType="slide" transparent visible={modalPagoVisible} onRequestClose={cerrarModalPago}>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenedor}>
            <Text style={styles.modalTitulo}>Seleccione método de pago</Text>

            <TouchableOpacity
              style={[styles.opcionPago, metodoPago === "local" && styles.opcionPagoSeleccionada]}
              onPress={() => setMetodoPago("local")}
            >
              <Text
                style={[styles.textoOpcionPago, metodoPago === "local" && styles.textoOpcionPagoSeleccionada]}
              >
                Pago en local
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opcionPago, metodoPago === "transferencia" && styles.opcionPagoSeleccionada]}
              onPress={() => setMetodoPago("transferencia")}
            >
              <Text
                style={[styles.textoOpcionPago, metodoPago === "transferencia" && styles.textoOpcionPagoSeleccionada]}
              >
                Transferencia bancaria
              </Text>
            </TouchableOpacity>

            {metodoPago === "transferencia" && (
              <View style={styles.selectorImagenContainer}>
                <TouchableOpacity style={styles.botonSeleccionarImagen} onPress={seleccionarImagen}>
                  <Text style={styles.textoBoton}>Seleccionar comprobante</Text>
                </TouchableOpacity>

                {comprobanteUri && (
                  <Image source={{ uri: comprobanteUri }} style={styles.previewImagen} resizeMode="contain" />
                )}
              </View>
            )}

            {isProcesandoPago ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : (
              <View style={styles.botonesModal}>
                <TouchableOpacity
                  style={[styles.botonModal, styles.botonCancelar]}
                  onPress={cerrarModalPago}
                >
                  <Text style={styles.textoBoton}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botonModal, styles.botonEnviar]}
                  onPress={enviarPedido}
                >
                  <Text style={styles.textoBoton}>Enviar pedido</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal transparent visible={exitoVisible} animationType="fade">
        <View style={styles.exitoFondo}>
          <View style={styles.exitoContenedor}>
            <Text style={styles.exitoTexto}>¡Pedido realizado con éxito!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  vacio: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 40,
  },
  itemContainer: {
    flexDirection: "row",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  imagen: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nombre: {
    fontWeight: "bold",
    fontSize: 16,
  },
  descripcion: {
    color: "#555",
    fontSize: 14,
    marginVertical: 4,
  },
  cantidadContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  botonCantidad: {
    backgroundColor: "#007AFF",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  textoBotonCantidad: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cantidadTexto: {
    marginHorizontal: 10,
    fontSize: 16,
  },
  precio: {
    marginTop: 6,
    fontWeight: "600",
  },
  botonQuitar: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FF3B30",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  textoBoton: {
    color: "#fff",
    fontWeight: "600",
  },
  totalContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#ccc",
    paddingTop: 12,
  },
  totalTexto: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
  },
  botonPagar: {
    marginTop: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 14,
  },
  textoBotonPagar: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
  modalFondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContenedor: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  opcionPago: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 10,
    marginVertical: 8,
  },
  opcionPagoSeleccionada: {
    backgroundColor: "#007AFF",
  },
  textoOpcionPago: {
    textAlign: "center",
    fontSize: 16,
    color: "#007AFF",
  },
  textoOpcionPagoSeleccionada: {
    color: "#fff",
    fontWeight: "bold",
  },
  selectorImagenContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  botonSeleccionarImagen: {
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  previewImagen: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  botonesModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  botonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  botonCancelar: {
    backgroundColor: "#ccc",
  },
  botonEnviar: {
    backgroundColor: "#4CAF50",
  },
  exitoFondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitoContenedor: {
    backgroundColor: "#4CAF50",
    padding: 30,
    borderRadius: 12,
  },
  exitoTexto: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default Carrito;
