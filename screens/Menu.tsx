import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Image,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useCarrito } from "../context/CarritoContext";
import { useAuth } from "../context/AuthContext";
import StarRating from "react-native-star-rating-widget";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { jwtDecode } from "jwt-decode";

// Configuración base
const API_BASE_URL = "http://192.168.8.102:3000";

// Interfaces
interface Categoria {
  id: number;
  nombre: string;
  imagen: string | null;
}

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string | null;
  categoria: {
    id: number;
    nombre: string;
  };
  promedio_calificaciones?: string;
  total_calificaciones?: number;
}

type PlatilloEnCarrito = Omit<Platillo, "imagen"> & {
  imagen: { uri: string };
  cantidad?: number;
};

interface Calificacion {
  id: number;
  usuario_id: number;
  platillo_id: number;
  calificacion: number;
  comentario: string;
  fecha_calificacion: string;
  usuario_nombre: string;
  fecha_formateada: string;
}

interface CalificacionesResponse {
  calificaciones: Calificacion[];
  promedio: string;
  total: number;
}

// Configuración de dimensiones
const { width } = Dimensions.get("window");
const NUM_COLUMNS = 2;
const ITEM_MARGIN = 16;
const ITEM_WIDTH = (width - ITEM_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH * 1.2;

const Menu = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlatillos, setLoadingPlatillos] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [platilloSeleccionado, setPlatilloSeleccionado] =
    useState<Platillo | null>(null);
  const [calificaciones, setCalificaciones] = useState<CalificacionesResponse>({
    calificaciones: [],
    promedio: "0.0",
    total: 0,
  });
  const [nuevaCalificacion, setNuevaCalificacion] = useState({
    calificacion: 0,
    comentario: "",
  });
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [ratingsCache, setRatingsCache] = useState<
    Record<number, { promedio: string; total: number }>
  >({});

  const { agregarAlCarrito } = useCarrito();
  const { user } = useAuth();
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const getImagenCategoria = (imagenBase64: string | null) => {
    if (!imagenBase64) {
      return { uri: "https://via.placeholder.com/150" };
    }

    // Asegurarse de que el base64 tenga el prefijo correcto
    const uri = imagenBase64.startsWith("data:image")
      ? imagenBase64
      : `data:image/jpeg;base64,${imagenBase64}`;

    return { uri };
  };

  // 2. Efecto optimizado para actualizaciones
  useEffect(() => {
    if (!platilloSeleccionado || !needsRefresh) return;

    const updateRatings = async () => {
      try {
        // Actualizar sólo el platillo seleccionado
        const response = await fetch(
          `${API_BASE_URL}/platillos/${platilloSeleccionado.id}/calificaciones`
        );

        if (response.ok) {
          const data = await response.json();

          // Actualizar el estado de platillos
          setPlatillos((prev) =>
            prev.map((p) =>
              p.id === platilloSeleccionado.id
                ? {
                    ...p,
                    promedio_calificaciones: data.promedio,
                    total_calificaciones: data.total,
                  }
                : p
            )
          );

          // Actualizar el modal si está visible
          if (modalVisible) {
            setCalificaciones(data);
          }
        }
      } catch (error) {
        console.error("Error actualizando calificaciones:", error);
      } finally {
        setNeedsRefresh(false);
      }
    };

    updateRatings();
  }, [platilloSeleccionado, needsRefresh, modalVisible]);

  const animateComment = () => {
    animation.setValue(0);
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const fetchCategorias = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categorias`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      setError("Error al cargar el menú. Por favor, inténtalo de nuevo.");
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatillos = async (categoriaId: number) => {
    setLoadingPlatillos(true);
    setError(null);
    try {
      console.log(
        `[DEBUG] Fetching platillos for categoria ID: ${categoriaId}`
      );
      const response = await fetch(
        `${API_BASE_URL}/categorias/${categoriaId}/platillos`
      );

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const data = await response.json();
      console.log("[DEBUG] Platillos raw data from API:", data); // Ver estructura completa

      if (!Array.isArray(data)) {
        throw new Error("La respuesta no es un array válido");
      }

      const platillosActualizados = data.map((platillo) => {
        console.log("[DEBUG] Platillo individual:", {
          id: platillo.id,
          nombre: platillo.nombre,
          imagen: platillo.imagen, // ¿Qué contiene aquí?
          categoria_id: platillo.categoria_id,
        });

        return {
          ...platillo,
          promedio_calificaciones: ratingsCache[platillo.id]?.promedio || "0.0",
          total_calificaciones: ratingsCache[platillo.id]?.total || 0,
        };
      });

      setPlatillos(platillosActualizados);
    } catch (err) {
      console.error("Error fetching platillos:", err);
      setError((err as Error).message || "Error al cargar los platillos");
      setPlatillos([]);
    } finally {
      setLoadingPlatillos(false);
    }
  };

  const fetchAllPlatillos = async () => {
    setLoadingPlatillos(true);
    try {
      const response = await fetch(`${API_BASE_URL}/platillos`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();

      const platillosConImagen = data.map((platillo: any) => ({
        ...platillo,
        imagen: platillo.imagen ? platillo.imagen.toString("base64") : null, // Asegura que es base64
        categoria: {
          id: platillo.categoria_id,
          nombre: platillo.categoria,
        },
      }));

      setPlatillos(platillosConImagen);
    } catch (err) {
      setError("Error al cargar todos los platillos");
      console.error("Error fetching all platillos:", err);
    } finally {
      setLoadingPlatillos(false);
    }
  };

  const handleAbrirCalificaciones = async (platillo: Platillo) => {
    setPlatilloSeleccionado(platillo);
    setLoadingCalificaciones(true);

    try {
      const headers = user?.token
        ? { Authorization: `Bearer ${user.token}` }
        : {};
      const response = await fetch(
        `${API_BASE_URL}/platillos/${platillo.id}/calificaciones`,
        { headers: headers as HeadersInit }
      );

      if (response.ok) {
        const data: CalificacionesResponse = await response.json();
        setCalificaciones(data);

        setRatingsCache((prev) => ({
          ...prev,
          [platillo.id]: {
            promedio: data.promedio,
            total: data.total,
          },
        }));

        setPlatillos((prev) =>
          prev.map((p) =>
            p.id === platillo.id
              ? {
                  ...p,
                  promedio_calificaciones: data.promedio,
                  total_calificaciones: data.total,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Error al obtener calificaciones:", err);
      Alert.alert("Error", "No se pudieron cargar las calificaciones");
    } finally {
      setLoadingCalificaciones(false);
      setModalVisible(true);
      setNuevaCalificacion({ calificacion: 0, comentario: "" });
    }
  };

  const handleEnviarCalificacion = async () => {
    try {
      if (!user || !user.token) {
        throw new Error("Debes iniciar sesión para calificar");
      }

      const decodedToken = jwtDecode(user.token) as { id: string };
      if (!decodedToken || !decodedToken.id) {
        throw new Error("Token inválido");
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      };

      const body = {
        usuario_id: decodedToken.id,
        platillo_id: platilloSeleccionado?.id,
        calificacion: Math.round(nuevaCalificacion.calificacion),
        comentario: nuevaCalificacion.comentario || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/platillos/${platilloSeleccionado?.id}/calificaciones`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error del servidor");
      }

      if (platilloSeleccionado) {
        await fetchCalificaciones(platilloSeleccionado.id);
      }

      animateComment();
      setNuevaCalificacion({ calificacion: 0, comentario: "" });
      Alert.alert("Éxito", "Calificación enviada");
    } catch (error) {
      console.error("Error completo:", error);
      Alert.alert(
        "Error",
        (error as Error).message || "Error al enviar calificación"
      );
    }
  };

  const handleEliminarCalificacion = async (calificacionId: number) => {
    try {
      if (!user?.token) {
        throw new Error("Debes iniciar sesión para eliminar comentarios");
      }

      const decodedToken = jwtDecode(user.token) as { id: string };
      const usuarioId = decodedToken.id;

      const response = await fetch(
        `${API_BASE_URL}/calificaciones/${calificacionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ usuario_id: usuarioId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      // Actualizar las calificaciones después de eliminar
      if (platilloSeleccionado) {
        await fetchCalificaciones(platilloSeleccionado.id);
        setNeedsRefresh(true); // Forzar actualización de la lista
      }

      Alert.alert("Éxito", "Comentario eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar calificación:", error);
      Alert.alert(
        "Error",
        (error as Error).message || "No se pudo eliminar el comentario"
      );
    }
  };

  const fetchCalificaciones = async (platilloId: number) => {
    setLoadingCalificaciones(true);
    try {
      const headers = user?.token
        ? { Authorization: `Bearer ${user.token}` }
        : {};
      const response = await fetch(
        `${API_BASE_URL}/platillos/${platilloId}/calificaciones`,
        { headers: headers as HeadersInit }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data: CalificacionesResponse = await response.json();
      setCalificaciones(data);

      // Actualizar caché y platillos
      setRatingsCache((prev) => ({
        ...prev,
        [platilloId]: {
          promedio: data.promedio,
          total: data.total,
        },
      }));

      setPlatillos((prev) =>
        prev.map((p) =>
          p.id === platilloId
            ? {
                ...p,
                promedio_calificaciones: data.promedio,
                total_calificaciones: data.total,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Error al obtener calificaciones:", err);
      Alert.alert("Error", "No se pudieron cargar las calificaciones");
    } finally {
      setLoadingCalificaciones(false);
    }
  };

  const handleAgregarAlCarrito = (platillo: Platillo) => {
    const platilloConImagenFormateada: PlatilloEnCarrito = {
      ...platillo,
      imagen: platillo.imagen
        ? { uri: getImagenCategoria(platillo.imagen).uri }
        : { uri: "" },
    };

    agregarAlCarrito(platilloConImagenFormateada);
  };

  const handlePressCategoria = (categoria: Categoria) => {
    setCategoriaSeleccionada(categoria);
    fetchPlatillos(categoria.id);
  };

  const handleBackToCategories = () => {
    setCategoriaSeleccionada(null);
    setPlatillos([]);
  };

  const renderCategoria = ({ item }: { item: Categoria }) => (
    <TouchableOpacity
      style={styles.categoriaContainer}
      onPress={() => handlePressCategoria(item)}
      activeOpacity={0.7}
    >
      <ImageBackground
        source={getImagenCategoria(item.imagen)}
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.gradient}
        />
        <Text style={styles.textoCategoria}>{item.nombre}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderPlatillo = ({ item }: { item: Platillo }) => (
    <View style={styles.platilloContainer}>
      <TouchableOpacity onPress={() => handleAbrirCalificaciones(item)}>
        <Image
          source={getImagenCategoria(item.imagen)}
          style={styles.platilloImagen}
        />
      </TouchableOpacity>
      <View style={styles.platilloInfo}>
        <Text style={styles.platilloNombre}>{item.nombre}</Text>
        <Text style={styles.platilloDescripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
        <Text style={styles.platilloPrecio}>
          ${Number(item.precio).toFixed(2)}
        </Text>

        <View style={styles.ratingContainer}>
          <View style={styles.ratingDisplay}>
            <StarRating
              rating={
                item.promedio_calificaciones
                  ? parseFloat(item.promedio_calificaciones)
                  : 0
              }
              onChange={() => {}}
              starSize={20}
              maxStars={5}
              enableHalfStar={true}
            />
            <Text style={styles.ratingText}>
              {item.promedio_calificaciones
                ? parseFloat(item.promedio_calificaciones).toFixed(1)
                : "0.0"}
              {item.total_calificaciones
                ? ` (${item.total_calificaciones})`
                : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleAbrirCalificaciones(item)}
            style={styles.verCalificacionesBtn}
          >
            <Text style={styles.verCalificacionesText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => handleAgregarAlCarrito(item)}
          style={styles.botonAgregar}
        >
          <Text style={styles.botonAgregarTexto}>Agregar al carrito</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCalificacion = ({ item }: { item: Calificacion }) => {
    const decodedToken = user?.token
      ? (jwtDecode(user.token) as { id: string }) || null
      : null;
    const esMiComentario = decodedToken?.id === item.usuario_id.toString();

    return (
      <Animated.View
        style={[
          styles.comentarioContainer,
          {
            opacity,
            transform: [{ translateY }],
            marginBottom: 12,
          },
        ]}
      >
        <View style={styles.comentarioHeader}>
          <Text style={styles.comentarioUsuario}>{item.usuario_nombre}</Text>
          <Text style={styles.comentarioFecha}>{item.fecha_formateada}</Text>
        </View>
        <Text style={styles.comentarioTexto}>{item.comentario}</Text>
        <View style={styles.comentarioRating}>
          <StarRating
            rating={item.calificacion}
            onChange={() => {}}
            starSize={20}
            maxStars={5}
            enableHalfStar={false}
          />
          {esMiComentario && (
            <TouchableOpacity
              onPress={() => handleEliminarCalificacion(item.id)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderModalCalificaciones = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <ScrollView style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setModalVisible(false)}
        >
          <AntDesign name="close" size={24} color="#ff6347" />
        </TouchableOpacity>

        {platilloSeleccionado && (
          <View style={{ flex: 1 }}>
            <Image
              source={getImagenCategoria(platilloSeleccionado.imagen)}
              style={styles.modalImagen}
              resizeMode="cover"
            />
            <Text style={styles.modalTitulo}>
              {platilloSeleccionado.nombre}
            </Text>

            <View style={styles.ratingSummary}>
              <Text style={styles.ratingPromedio}>
                {calificaciones.promedio}
              </Text>
              <StarRating
                rating={parseFloat(calificaciones.promedio) || 0}
                starSize={28}
                maxStars={5}
                onChange={() => {}}
              />
              <Text style={styles.ratingTotal}>
                ({calificaciones.total} calificaciones)
              </Text>
            </View>

            {user && (
              <View style={styles.nuevaCalificacionContainer}>
                <Text style={styles.subtitulo}>Deja tu calificación:</Text>
                <StarRating
                  rating={nuevaCalificacion.calificacion}
                  onChange={(rating) =>
                    setNuevaCalificacion({
                      ...nuevaCalificacion,
                      calificacion: rating,
                    })
                  }
                  starSize={28}
                  maxStars={5}
                />
                <TextInput
                  style={styles.comentarioInput}
                  placeholder="Escribe tu comentario (opcional)..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  value={nuevaCalificacion.comentario}
                  onChangeText={(text) =>
                    setNuevaCalificacion({
                      ...nuevaCalificacion,
                      comentario: text,
                    })
                  }
                />
                <TouchableOpacity
                  style={[
                    styles.botonEnviar,
                    nuevaCalificacion.calificacion === 0 &&
                      styles.botonDisabled,
                  ]}
                  onPress={handleEnviarCalificacion}
                  disabled={nuevaCalificacion.calificacion === 0}
                >
                  <Text style={styles.botonEnviarTexto}>
                    Enviar calificación
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {loadingCalificaciones ? (
              <ActivityIndicator size="large" color="#ff6347" />
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.comentariosTitulo}>
                  Opiniones de otros usuarios ({calificaciones.total})
                </Text>

                {calificaciones.calificaciones.length > 0 ? (
                  <View>
                    {calificaciones.calificaciones.map(
                      (calificacion, index) => (
                        <View key={index} style={styles.comentarioContainer}>
                          <Text style={styles.comentarioTexto}>
                            {calificacion.comentario}
                          </Text>
                          <Text style={styles.comentarioFecha}>
                            {calificacion.fecha_formateada}
                          </Text>
                          <Text style={styles.comentarioUsuario}>
                            {calificacion.usuario_nombre}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                ) : (
                  <Text style={styles.sinComentarios}>
                    No hay calificaciones aún. ¡Sé el primero en opinar!
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
  );

  useEffect(() => {
    fetchCategorias();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6347" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            categoriaSeleccionada
              ? fetchPlatillos(categoriaSeleccionada.id)
              : fetchCategorias();
          }}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (categoriaSeleccionada) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToCategories}
        >
          <Text style={styles.backButtonText}>← Volver a categorías</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>{categoriaSeleccionada.nombre}</Text>

        {loadingPlatillos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff6347" />
            <Text style={styles.loadingText}>Cargando platillos...</Text>
          </View>
        ) : (
          <>
            {platillos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No hay platillos disponibles en esta categoría
                </Text>
              </View>
            ) : (
              <FlatList
                data={platillos}
                renderItem={renderPlatillo}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
        {renderModalCalificaciones()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nuestro Menú</Text>
      <FlatList
        data={categorias}
        renderItem={renderCategoria}
        keyExtractor={(item) => item.id.toString()}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: ITEM_MARGIN,
    backgroundColor: "#e6f7ff",
    borderTopWidth: 2,
    borderColor: "#0077b6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e6f7ff",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: "#0077b6",
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#e6f7ff",
    borderWidth: 1,
    borderColor: "#ef476f",
    borderRadius: 15,
    margin: 20,
  },
  errorText: {
    fontSize: 20,
    color: "#ef476f",
    textAlign: "center",
    marginBottom: 25,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#00b4d8",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0077b6",
    elevation: 3,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    textTransform: "uppercase",
  },
  botonDisabled: {
    backgroundColor: "#90e0ef",
    opacity: 0.7,
  },
  titulo: {
    fontSize: 32,
    fontWeight: "bold",
    marginVertical: 25,
    textAlign: "center",
    color: "#0077b6",
    textShadowColor: "rgba(0, 119, 182, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gridContainer: {
    paddingBottom: 25,
    paddingHorizontal: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: ITEM_MARGIN,
  },
  categoriaContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#0077b6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#caf0f8",
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  imageStyle: {
    borderRadius: 15,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "15%",
    backgroundColor: "rgba(9, 135, 160, 0.7)",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  textoCategoria: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  backButton: {
    margin: 20,
    padding: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 180, 216, 0.2)",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#0077b6",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 5,
  },
  listContainer: {
    paddingBottom: 25,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#e6f7ff",
    borderRadius: 15,
    margin: 20,
    borderWidth: 1,
    borderColor: "#90e0ef",
  },
  emptyText: {
    fontSize: 18,
    color: "#0077b6",
    textAlign: "center",
    lineHeight: 26,
  },
  platilloContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 20,
    marginHorizontal: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#0077b6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    borderWidth: 1.5,
    borderColor: "#90e0ef",
  },
  platilloImagen: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderBottomWidth: 1,
    borderColor: "#caf0f8",
  },
  platilloInfo: {
    padding: 20,
    backgroundColor: "white",
  },
  platilloNombre: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0077b6",
    letterSpacing: 0.3,
  },
  platilloDescripcion: {
    fontSize: 16,
    color: "#48cae4",
    marginBottom: 15,
    lineHeight: 22,
  },
  platilloPrecio: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0096c7",
    marginTop: 5,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#caf0f8",
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#0077b6",
    fontWeight: "bold",
  },
  verCalificacionesBtn: {
    backgroundColor: "#00b4d8",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 5,
    elevation: 2,
    marginLeft: 10,
  },
  verCalificacionesText: {
    color: "white",
    fontSize: 14,
    fontWeight: "300",
  },
  botonAgregar: {
    backgroundColor: "#0096c7",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#0077b6",
  },
  botonAgregarTexto: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  comentarioRating: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#e6f7ff",
    padding: 20,
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    padding: 10,
    backgroundColor: "rgba(0, 180, 216, 0.2)",
    borderRadius: 20,
    marginBottom: 15,
  },
  modalImagen: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#0077b6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalTitulo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0077b6",
    textAlign: "center",
    textDecorationLine: "underline",
    textDecorationColor: "#00b4d8",
  },
  ratingSummary: {
    alignItems: "center",
    marginBottom: 25,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#90e0ef",
  },
  ratingPromedio: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#00b4d8",
    marginBottom: 5,
  },
  ratingTotal: {
    fontSize: 16,
    color: "#48cae4",
    marginTop: 5,
    fontStyle: "italic",
  },
  subtitulo: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 15,
    color: "#0077b6",
    borderBottomWidth: 2,
    borderColor: "#00b4d8",
    paddingBottom: 5,
    alignSelf: "flex-start",
  },
  nuevaCalificacionContainer: {
    marginBottom: 25,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#90e0ef",
  },
  comentarioInput: {
    borderWidth: 1.5,
    borderColor: "#90e0ef",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    height: 100,
    textAlignVertical: "top",
    backgroundColor: "white",
    fontSize: 16,
    color: "#0077b6",
  },
  botonEnviar: {
    backgroundColor: "#00b4d8",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    borderWidth: 1,
    borderColor: "#0077b6",
  },
  botonEnviarTexto: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    textTransform: "uppercase",
  },
  comentariosTitulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0077b6",
    textAlign: "center",
    textDecorationLine: "underline",
    textDecorationColor: "#00b4d8",
  },
  comentarioContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#90e0ef",
  },
  comentarioAutor: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0077b6",
  },
  comentarioTexto: {
    fontSize: 16,
    color: "#0077b6",
    marginTop: 5,
  },
  comentarioFecha: {
    fontSize: 14,
    color: "#48cae4",
    marginTop: 5,
    fontStyle: "italic",
  },
  comentarioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  comentarioUsuario: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0077b6",
  },
  sinComentarios: {
    fontSize: 16,
    color: "#0077b6",
    textAlign: "center",
    marginTop: 20,
  },

  deleteButton: {
    marginLeft: 10,
    padding: 5,
    backgroundColor: "#ef476f",
    borderRadius: 5,
  },
});
export default Menu;
