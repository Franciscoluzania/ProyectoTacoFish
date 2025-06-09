import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number | null | undefined;
  calificacion_promedio: number;
  total_calificaciones: number;
  imagen: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.6; // Más compacto
const CARD_SPACING = 14;

interface CarruselProps {
  modoLoop?: boolean; // true: loop continuo, false: ping-pong
}

const Carrusel: React.FC<CarruselProps> = ({ modoLoop = false }) => {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const directionRef = useRef(1); // 1 = derecha, -1 = izquierda

  useEffect(() => {
    const obtenerPlatillos = async () => {
      try {
        const response = await fetch(
          "http://192.168.8.102:3000/api/platillos/mejores-calificados"
        );
        const text = await response.text();
        const data = JSON.parse(text);

        if (Array.isArray(data)) {
          setPlatillos(data);
        }
      } catch (error) {
        console.error("Error al cargar los platillos:", error);
      } finally {
        setLoading(false);
      }
    };
    obtenerPlatillos();
  }, []);

  useEffect(() => {
    if (platillos.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        let nextIndex = prevIndex + directionRef.current;

        if (modoLoop) {
          // Modo loop continuo
          if (nextIndex >= platillos.length) {
            nextIndex = 0;
          }
        } else {
          // Modo ping-pong
          if (nextIndex >= platillos.length) {
            directionRef.current = -1;
            nextIndex = platillos.length - 2;
          } else if (nextIndex < 0) {
            directionRef.current = 1;
            nextIndex = 1;
          }
        }

        scrollViewRef.current?.scrollTo({
          x: nextIndex * (CARD_WIDTH + CARD_SPACING),
          animated: true,
        });

        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [platillos, modoLoop]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / (CARD_WIDTH + CARD_SPACING));
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0084FF" />
        <Text style={styles.loadingText}>Cargando platillos destacados...</Text>
      </View>
    );
  }

  if (platillos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          No hay platillos destacados disponibles.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carrusel}
        ref={scrollViewRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        pagingEnabled={false}
      >
        {platillos.map((platillo) => {
          const imagenUri =
            platillo.imagen && platillo.imagen.trim() !== ""
              ? platillo.imagen.startsWith("data:image")
                ? platillo.imagen
                : `data:image/jpeg;base64,${platillo.imagen}`
              : null;

          const precioNum = Number(platillo.precio);
          const precioFormateado = !isNaN(precioNum)
            ? precioNum.toFixed(2)
            : "0.00";

          const calificacionPromedio =
            Number(platillo.calificacion_promedio) || 0;

          return (
            <View key={platillo.id} style={styles.tarjeta}>
              {imagenUri ? (
                <Image
                  source={{ uri: imagenUri }}
                  style={styles.imagen}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.imagen,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={{ color: "#aaa" }}>Sin imagen</Text>
                </View>
              )}

              <View style={styles.contenido}>
                <Text
                  style={styles.nombre}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {platillo.nombre || "Nombre no disponible"}
                </Text>

                <Text style={styles.precio}>${precioFormateado}</Text>

                <View style={styles.ratingSimpleContainer}>
                  <Text style={styles.ratingNumber}>
                    {calificacionPromedio.toFixed(1)}{" "}
                    <Text style={styles.star}>★</Text>
                  </Text>
                </View>

                <Text
                  style={styles.descripcion}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {platillo.descripcion || "Sin descripción"}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.indicatorsContainer}>
        {platillos.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicator,
              i === activeIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingVertical: 10,
  },
  carrusel: {
    paddingHorizontal: 16,
  },
  tarjeta: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginRight: CARD_SPACING,
    overflow: "hidden",
    shadowColor: "#0084FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  imagen: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: "#f0f0f0",
  },
  contenido: {
    padding: 12,
  },
  nombre: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: "#222",
  },
  precio: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF5A5F",
    marginBottom: 6,
  },
  ratingSimpleContainer: {
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 14,
    color: "#0084FF",
    fontWeight: "700",
  },
  star: {
    color: "#FFB400",
    fontSize: 16,
  },
  descripcion: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
  },
  indicatorsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#bbb",
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: "#0084FF",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default Carrusel;
