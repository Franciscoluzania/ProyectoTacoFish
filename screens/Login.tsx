import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "@/types/types";

interface LoginProps {
  navigation: NavigationProp<RootStackParamList>;
}

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const [telefono, setTelefono] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, login, loading: authLoading, error: authError, clearError } = useAuth();

  // Redirección después del login exitoso
  useEffect(() => {
    if (user) {
      if (user.tipo_usuario === "admin") {
        navigation.reset({ index: 0, routes: [{ name: "PerfilAdmin" }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Perfil" }] });
      }
    }
  }, [user]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");
    clearError();

    const cleanedTelefono = formatPhoneNumber(telefono);

    // Validaciones
    if (!cleanedTelefono || !contraseña.trim()) {
      setError("Por favor, completa todos los campos");
      setIsSubmitting(false);
      return;
    }

    if (cleanedTelefono.length !== 10) {
      setError("El teléfono debe tener 10 dígitos");
      setIsSubmitting(false);
      return;
    }

    const { error: loginError } = await login(cleanedTelefono, contraseña);

    if (loginError) {
      setError(loginError);
    }

    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/fondoLogin3.jpg")}
      style={styles.background}
      blurRadius={10}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Iniciar Sesión</Text>

          <View style={styles.registerContainer}>
            <Text style={styles.subtitle}>¿No tienes cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Registro")}>
              <Text style={styles.registerText}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Teléfono:</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={(text) => {
              setTelefono(text);
              setError("");
              clearError();
            }}
            placeholder="10 dígitos"
            placeholderTextColor="#999"
            maxLength={10}
          />

          <Text style={styles.label}>Contraseña:</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={contraseña}
            onChangeText={(text) => {
              setContraseña(text);
              setError("");
              clearError();
            }}
            placeholder="Tu contraseña"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.button, isSubmitting && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 20,
    borderRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007BFF",
    textAlign: "center",
    marginBottom: 20,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  registerText: {
    fontSize: 16,
    color: "#007BFF",
    fontWeight: "bold",
  },
  label: {
    fontSize: 16,
    color: "#007BFF",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#007BFF",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  button: {
    width: "100%",
    backgroundColor: "#0084FF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
});

export default Login;
