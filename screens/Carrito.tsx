import React, { useState } from "react";
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

const Carrito = () => {
  const {
    carrito,
    quitarDelCarrito,
    limpiarCarrito,
    incrementarCantidad,
    decrementarCantidad,
  } = useCarrito();

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
          "Necesitas permitir acceso a la galería para subir imágenes"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const base64 = asset.base64;
        const uri = asset.uri;

        if (!base64 || !uri) {
          Alert.alert("Error", "No se pudo obtener la imagen correctamente.");
          return;
        }

        const mimeType = getMimeFromUri(uri);

        setComprobanteBase64(base64);
        setComprobanteMime(mimeType);
        setComprobanteUri(uri);
      }
    } catch (error) {
      console.error("Error seleccionando imagen:", error);
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

    setIsProcesandoPago(true);

    try {
      const payload = {
        carrito: carrito.map(({ id, cantidad }) => ({ id, cantidad })),
        total,
        metodo_pago: metodoPago,
        comprobanteBase64,
        comprobanteMime,
      };

      const response = await axios.post(
        "http://192.168.56.1:3000/api/pedidos",
        payload
      );

      if (response.status === 200 || response.status === 201) {
        setExitoVisible(true);
        limpiarCarrito();
        setModalPagoVisible(false);
        setTimeout(() => setExitoVisible(false), 2000);
      } else {
        Alert.alert("Error", "No se pudo procesar el pedido.");
      }
    } catch (error) {
      console.error("Error enviando pedido:", error);
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
          ${Number(item.precio).toFixed(2)} c/u | Total: $
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
      <FlatList
        data={carrito}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.vacio}>Tu carrito está vacío.</Text>
        }
      />

      {carrito.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
          <TouchableOpacity style={styles.botonPagar} onPress={abrirModalPago}>
            <Text style={styles.textoBoton}>Proceder al Pago</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botonLimpiar}
            onPress={limpiarCarrito}
          >
            <Text style={styles.textoBoton}>Vaciar carrito</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de pago */}
      <Modal visible={modalPagoVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona método de pago</Text>

            <TouchableOpacity
              style={[
                styles.opcionPago,
                metodoPago === "transferencia" && styles.opcionPagoSeleccionada,
              ]}
              onPress={() => setMetodoPago("transferencia")}
            >
              <Text>Transferencia bancaria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcionPago,
                metodoPago === "local" && styles.opcionPagoSeleccionada,
              ]}
              onPress={() => setMetodoPago("local")}
            >
              <Text>Pago en local</Text>
            </TouchableOpacity>

            {metodoPago === "transferencia" && (
              <>
                <Text style={{ marginVertical: 8 }}>
                  Sube foto del comprobante:
                </Text>
                <TouchableOpacity
                  style={styles.botonSubir}
                  onPress={seleccionarImagen}
                >
                  <Text style={styles.textoBoton}>
                    {comprobanteBase64
                      ? "Cambiar imagen"
                      : "Seleccionar imagen"}
                  </Text>
                </TouchableOpacity>
                {comprobanteUri && (
                  <Image
                    source={{ uri: comprobanteUri }}
                    style={styles.previewImagen}
                  />
                )}
              </>
            )}

            {isProcesandoPago ? (
              <ActivityIndicator
                size="large"
                color="#000"
                style={{ marginTop: 20 }}
              />
            ) : (
              <View style={styles.botonesModal}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={cerrarModalPago}
                >
                  <Text>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botonConfirmar}
                  onPress={enviarPedido}
                >
                  <Text style={{ color: "#fff" }}>Confirmar pago</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Éxito */}
      <Modal visible={exitoVisible} transparent animationType="fade">
        <View style={styles.modalExitoContainer}>
          <View style={styles.modalExitoContent}>
            <Text style={styles.exitoCheck}>✓</Text>
            <Text style={styles.exitoTexto}>¡Pedido enviado con éxito!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#e6f0ff" }, // azul claro suave de fondo
  itemContainer: {
    flexDirection: "row",
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#ffffff", // blanco para resaltar el item
    borderRadius: 8,
    shadowColor: "#0000ff", // sombra azul tenue
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagen: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
  infoContainer: { flex: 1 },
  nombre: { fontSize: 18, fontWeight: "bold", color: "#003366" }, // azul oscuro para títulos
  descripcion: { fontSize: 14, color: "#336699" }, // azul medio para descripción
  cantidadContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  botonCantidad: {
    backgroundColor: "#007bff", // azul vibrante
    padding: 8,
    borderRadius: 5,
  },
  textoBotonCantidad: { color: "#fff", fontSize: 16 },
  cantidadTexto: { marginHorizontal: 12, fontSize: 16, color: "#003366" },
  precio: { fontSize: 16, marginTop: 6, color: "#004080", fontWeight: "600" },
  botonQuitar: {
    backgroundColor: "#0056b3", // azul más oscuro para botón quitar
    marginTop: 8,
    padding: 6,
    borderRadius: 5,
  },
  textoBoton: { color: "#fff", textAlign: "center" },
  totalContainer: {
    borderTopWidth: 1,
    borderColor: "#99bbff",
    marginTop: 10,
    paddingTop: 16,
    alignItems: "center",
  },
  total: { fontSize: 20, fontWeight: "bold", color: "#003366" },
  botonPagar: {
    backgroundColor: "#004085", // azul fuerte para botón pagar
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  botonLimpiar: {
    backgroundColor: "#003366", // azul oscuro para botón limpiar
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  vacio: { textAlign: "center", marginTop: 30, fontSize: 16, color: "#6699cc" }, // azul suave
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 51, 102, 0.5)", // overlay azul semi-transparente
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#ffffff", borderRadius: 10, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#003366",
  },
  opcionPago: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#99bbff",
    borderRadius: 8,
    marginBottom: 12,
  },
  opcionPagoSeleccionada: {
    backgroundColor: "#cce0ff",
    borderColor: "#004085",
  },
  botonSubir: {
    backgroundColor: "#0069d9",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  previewImagen: {
    width: 150,
    height: 150,
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#004080",
  },
  botonesModal: { flexDirection: "row", justifyContent: "space-between" },
  botonCancelar: {
    padding: 12,
    backgroundColor: "#99bbff",
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  botonConfirmar: {
    padding: 12,
    backgroundColor: "#004085",
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  modalExitoContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 51, 102, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalExitoContent: {
    backgroundColor: "#ffffff",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  exitoCheck: { fontSize: 48, color: "#007bff", marginBottom: 10 },
  exitoTexto: { fontSize: 18, fontWeight: "bold", color: "#003366" },
});

export default Carrito;
