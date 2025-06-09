import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";

interface Categoria {
  id: number;
  nombre: string;
  imagen: string;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = 190;

const CategoriasVisual = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    fetch("http://192.168.8.102:3000/categorias")
      .then((res) => res.json())
      .then((data) => setCategorias(data))
      .catch((err) => setError(err.message));
  }, []);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        renderItem={({ item }) => (
          <TouchableWithoutFeedback
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
              <ImageBackground
                source={{ uri: `data:image/jpeg;base64,${item.imagen}` }}
                style={styles.imageBackground}
                imageStyle={{ borderRadius: 20 }}
                resizeMode="cover"
              >
                {/* Fondo oscuro traslúcido para el texto */}
                <View style={styles.textBackground} />
                <View style={styles.textOverlay}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                </View>
              </ImageBackground>
            </Animated.View>
          </TouchableWithoutFeedback>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 25,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    marginRight: 18,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#222",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    backgroundColor: "#000",
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },
  textBackground: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    height: 50,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
  },
  textOverlay: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  nombre: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1.1,
  },
});

export default CategoriasVisual;
