import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Carrusel from "@/components/Carrusel";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import CategoriasVisual from "@/components/CategoriasVisual";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

interface Props {
  navigation: NavigationProp<ParamListBase>;
}

const { width } = Dimensions.get("window");

export default function Inicio({ navigation }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [hayCambiosEstado, setHayCambiosEstado] = useState(false);
  const { user: usuario } = useAuth();

  const pedidosPrevRef = useRef<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (usuario?.id) {
        axios
          .get(`http://192.168.8.102:3000/api/pedidos/usuario/${usuario.id}`)
          .then((res) => {
            const nuevosPedidos = res.data;
            setPedidos(nuevosPedidos);

            const prevPedidos = pedidosPrevRef.current;
            let cambioDetectado = false;

            for (const nuevo of nuevosPedidos) {
              const prev = prevPedidos.find((p) => p.id === nuevo.id);
              if (prev && prev.estado !== nuevo.estado) {
                cambioDetectado = true;
                break;
              }
            }

            pedidosPrevRef.current = nuevosPedidos;
            setHayCambiosEstado(cambioDetectado);
          })
          .catch((err) => console.error("Error al obtener pedidos:", err));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [usuario]);

  const pedidosPendientes = pedidos.filter(
    (pedido) => pedido.estado !== "realizado" && pedido.estado !== "cancelado"
  );

  const ultimoPedido = pedidosPendientes.slice(-1); // solo el último pendiente

  const contadorNotificaciones = hayCambiosEstado
    ? 1
    : ultimoPedido.length > 0
    ? 1
    : 0;

  const eliminarNotificacion = (pedidoId: number) => {
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require("@/assets/images/Fondos/Fondo_Principal.png")}
        style={[StyleSheet.absoluteFillObject, styles.backgroundImage]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!tooltipVisible}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>TacoFish</Text>
          <TouchableOpacity onPress={() => setTooltipVisible(!tooltipVisible)}>
            <View>
              <Ionicons name="notifications-outline" size={28} color="#000" />
              {contadorNotificaciones > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {contadorNotificaciones}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          La mejor comida del mar de la sierra
        </Text>
        <View style={styles.divider} />

        {/* DESTACADOS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Platillos Destacados</Text>
          </View>
          <Carrusel modoLoop={true} />
        </View>

        <Text style={styles.sectionTitle}>Categorias</Text>
        <CategoriasVisual />
      </ScrollView>

      {/* TOOLTIP */}
      {tooltipVisible && (
        <>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setTooltipVisible(false)}
          />
          <View style={[styles.tooltip, { top: 100, right: 20 }]}>
            {ultimoPedido.length === 0 ? (
              <Text style={styles.noNotificationsText}>
                No tienes nuevas notificaciones.
              </Text>
            ) : (
              ultimoPedido.map((pedido) => (
                <View key={pedido.id} style={styles.notificationCard}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>
                      Pedido #{pedido.id}
                    </Text>
                    <Text style={styles.notificationDetail}>
                      Método:{" "}
                      <Text style={styles.boldText}>{pedido.metodo_pago}</Text>
                    </Text>
                    <Text style={styles.notificationDetail}>
                      Total:{" "}
                      <Text style={styles.boldText}>
                        ${Number(pedido.total).toFixed(2)}
                      </Text>
                    </Text>
                    <Text
                      style={[styles.notificationDetail, styles.statusText]}
                    >
                      Estado: {pedido.estado}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => eliminarNotificacion(pedido.id)}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                    accessibilityLabel={`Eliminar notificación pedido ${pedido.id}`}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            <TouchableOpacity onPress={() => setTooltipVisible(false)}>
              <Text style={styles.tooltipClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: 250,
    top: 0,
    resizeMode: "cover",
  },
  header: {
    padding: 20,
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0084FF",
  },
  subtitle: {
    fontSize: 14,
    marginHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#00DDFF",
    marginHorizontal: 20,
    marginTop: 10,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginHorizontal: 20,
    marginTop: 20,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 280,
    maxHeight: 350,
    zIndex: 1000,
  },
  noNotificationsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0084FF",
    marginBottom: 4,
  },
  notificationDetail: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  boldText: {
    fontWeight: "700",
  },
  statusText: {
    color: "#005BBB",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 20,
    padding: 6,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tooltipClose: {
    color: "#0084FF",
    fontWeight: "600",
    textAlign: "right",
    marginTop: 10,
    fontSize: 16,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 999,
  },
});
