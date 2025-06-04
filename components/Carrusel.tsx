import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Rating } from "react-native-ratings";

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  promedio_calificacion: number;
  numero_calificaciones: number;
  imagen: string; // Base64
}

const Carrusel = () => {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerPlatillos = async () => {
      try {
        const response = await fetch("http://10.19.100.95/platillos/mejores");
        const data = await response.json();
        setPlatillos(data);
      } catch (error) {
        console.error("Error al cargar los platillos:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerPlatillos();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text>Cargando platillos destacados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Platillos Destacados ⭐</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carrusel}
      >
        {platillos.map((platillo) => (
          <View key={platillo.id} style={styles.tarjeta}>
            <Image
              source={{ uri: platillo.imagen }}
              style={styles.imagen}
              resizeMode="cover"
            />
            <View style={styles.contenido}>
              <Text style={styles.nombre}>{platillo.nombre}</Text>
              <Text style={styles.precio}>${platillo.precio.toFixed(2)}</Text>
              <View style={styles.ratingContainer}>
                <Rating
                  type="star"
                  ratingCount={5}
                  imageSize={20}
                  readonly
                  startingValue={platillo.promedio_calificacion}
                  tintColor="#f8f8f8"
                  ratingBackgroundColor="#c8c7c8"
                />
                <Text style={styles.calificacionText}>
                  {platillo.promedio_calificacion.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.descripcion} numberOfLines={2}>
                {platillo.descripcion}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
    borderRadius: 15,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 20,
    marginBottom: 15,
    color: "#2c3e50",
  },
  carrusel: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  tarjeta: {
    width: 250,
    backgroundColor: "white",
    borderRadius: 15,
    marginRight: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  imagen: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  contenido: {
    padding: 15,
  },
  nombre: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    color: "#2c3e50",
  },
  precio: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  calificacionText: {
    fontSize: 14,
    color: "#f39c12",
    marginLeft: 8,
    fontWeight: "700",
  },
  descripcion: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Carrusel;
