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

  // Código de cliente anónimo si no hay usuario logueado
  const [clienteAnonimo, setClienteAnonimo] = useState(() =>
    !user ? "anonimo-" + Date.now() : null
  );

  const total = carrito.reduce(
    (sum, item) => sum + item.precio * (item.cantidad || 1),
    0
  );

  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState<
    "transferencia" | "local" | null
  >(null);
  const [comprobanteBase64, setComprobanteBase64] = useState<string | null>(
    null
  );
  const [comprobanteMime, setComprobanteMime] = useState<string | null>(null);
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [isProcesandoPago, setIsProcesandoPago] = useState(false);
  const [exitoVisible, setExitoVisible] = useState(false);

  // Guarda la referencia del pedido (codigo anonimo o null si user)
  const [referenciaPedido, setReferenciaPedido] = useState<string | null>(null);

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
      const permisoResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permisoResult.status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitas permitir acceso a la galería."
        );
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
      Alert.alert(
        "Error",
        "Debes subir la foto del comprobante de transferencia"
      );
      return;
    }

    // Validar user o cliente anonimo
    if (!user?.id && !clienteAnonimo) {
      Alert.alert(
        "Error",
        "No se ha identificado al usuario ni cliente anónimo."
      );
      return;
    }

    setIsProcesandoPago(true);

    try {
      const payload = {
        carrito: carrito.map(({ id, cantidad }) => ({
          id,
          cantidad: cantidad || 1,
        })),
        total,
        metodo_pago: metodoPago,
        comprobanteBase64,
        comprobanteMime,
        user_id: user?.id || null,
        cliente_anonimo: user ? null : clienteAnonimo,
      };

      const response = await axios.post(
        "http://192.168.8.102:3000/api/pedidos",
        payload
      );

      if (response.status === 201) {
        setExitoVisible(true);
        limpiarCarrito();
        setModalPagoVisible(false);

        // Guardar referencia pedido para mostrar en modal de éxito
        if (!user && clienteAnonimo) {
          setReferenciaPedido(clienteAnonimo);
        } else {
          setReferenciaPedido(null);
        }

        // Ya no cerramos automáticamente
        // setTimeout(() => {
        //   setExitoVisible(false);
        //   setReferenciaPedido(null);
        // }, 4000);
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

  const cerrarModalExito = () => {
    setExitoVisible(false);
    setReferenciaPedido(null);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.itemContainer}>
      {item.imagen && <Image source={item.imagen} style={styles.imagen} />}
      <View style={styles.infoContainer}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        <View style={styles.cantidadContainer}>
          <TouchableOpacity
            style={styles.botonCantidad}
            onPress={() => decrementarCantidad(item.id)}
          >
            <Text style={styles.textoBotonCantidad}>-</Text>
          </TouchableOpacity>
          <Text style={styles.cantidadTexto}>{item.cantidad || 1}</Text>
          <TouchableOpacity
            style={styles.botonCantidad}
            onPress={() => incrementarCantidad(item.id)}
          >
            <Text style={styles.textoBotonCantidad}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.precio}>
          ${Number(item.precio).toFixed(2)} c/u | Total:{" "}
          {(item.precio * (item.cantidad || 1)).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.botonQuitar}
          onPress={() => quitarDelCarrito(item.id)}
        >
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
        style={[
          styles.botonPagar,
          carrito.length === 0 && { backgroundColor: "#94d3a2" },
        ]}
        onPress={abrirModalPago}
        disabled={carrito.length === 0}
      >
        <Text style={styles.textoBotonPagar}>Pagar</Text>
      </TouchableOpacity>

      {/* Modal de pago */}
      <Modal
        animationType="slide"
        transparent
        visible={modalPagoVisible}
        onRequestClose={cerrarModalPago}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenedor}>
            <Text style={styles.modalTitulo}>Seleccione método de pago</Text>

            <TouchableOpacity
              style={[
                styles.opcionPago,
                metodoPago === "local" && styles.opcionPagoSeleccionada,
              ]}
              onPress={() => setMetodoPago("local")}
            >
              <Text
                style={[
                  styles.textoOpcionPago,
                  metodoPago === "local" && styles.textoOpcionPagoSeleccionada,
                ]}
              >
                Pago en local
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcionPago,
                metodoPago === "transferencia" && styles.opcionPagoSeleccionada,
              ]}
              onPress={() => setMetodoPago("transferencia")}
            >
              <Text
                style={[
                  styles.textoOpcionPago,
                  metodoPago === "transferencia" &&
                    styles.textoOpcionPagoSeleccionada,
                ]}
              >
                Transferencia bancaria
              </Text>
            </TouchableOpacity>

            {metodoPago === "transferencia" && (
              <View style={styles.selectorImagenContainer}>
                <TouchableOpacity
                  style={styles.botonSeleccionarImagen}
                  onPress={seleccionarImagen}
                >
                  <Text style={styles.textoBoton}>Seleccionar comprobante</Text>
                </TouchableOpacity>

                {comprobanteUri && (
                  <Image
                    source={{ uri: comprobanteUri }}
                    style={styles.previewImagen}
                    resizeMode="contain"
                  />
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
            <TouchableOpacity
              onPress={cerrarModalExito}
              style={styles.botonCerrarModal}
            >
              <Text style={styles.textoCerrarModal}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.exitoTexto}>¡Pedido realizado con éxito!</Text>
            {referenciaPedido && (
              <Text style={styles.exitoReferencia}>
                Código de referencia: {referenciaPedido}
              </Text>
            )}
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
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  vacio: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 32,
  },
  itemContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
  },
  imagen: {
    width: 100,
    height: 100,
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  nombre: {
    fontWeight: "bold",
    fontSize: 18,
  },
  descripcion: {
    fontSize: 14,
    color: "#666",
  },
  cantidadContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  botonCantidad: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  textoBotonCantidad: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cantidadTexto: {
    marginHorizontal: 12,
    fontSize: 16,
  },
  precio: {
    fontWeight: "600",
    marginTop: 8,
  },
  botonQuitar: {
    backgroundColor: "#FF3B30",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  textoBoton: {
    color: "#fff",
    fontWeight: "600",
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
    marginTop: 12,
  },
  totalTexto: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
  },
  botonPagar: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  textoBotonPagar: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContenedor: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  opcionPago: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 10,
    marginBottom: 10,
  },
  opcionPagoSeleccionada: {
    backgroundColor: "#007AFF",
  },
  textoOpcionPago: {
    color: "#007AFF",
    fontWeight: "600",
    textAlign: "center",
  },
  textoOpcionPagoSeleccionada: {
    color: "#fff",
  },
  selectorImagenContainer: {
    marginVertical: 12,
    alignItems: "center",
  },
  botonSeleccionarImagen: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginBottom: 12,
  },
  previewImagen: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  botonesModal: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  botonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: "center",
  },
  botonCancelar: {
    backgroundColor: "#999",
  },
  botonEnviar: {
    backgroundColor: "#4CAF50",
  },
  exitoFondo: {
    flex: 1,
    backgroundColor: "rgba(0, 100, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  exitoContenedor: {
    backgroundColor: "#007700",
    padding: 24,
    borderRadius: 12,
    width: "85%",
    alignItems: "center",
    position: "relative",
  },
  exitoTexto: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  exitoReferencia: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  botonCerrarModal: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "#005500",
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  textoCerrarModal: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 20,
  },
});

export default Carrito;
