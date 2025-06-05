import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  
  id: string;
  nombre: string;
  telefono: string;
  tipo_usuario: string;
  token: string; // Asegúrate de que esto esté definido
};

type AuthContextType = {
  user: User | null;
  login: (
    telefono: string,
    contraseña: string
  ) => Promise<{ user: User | null; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  apiUrl?: "http://192.168.8.102:3000"; // Add this line
  // Add this line
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ user: null }),
  logout: async () => {},
  loading: true,
  error: null,
  clearError: () => {},
});

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        console.log("Token:", token);

        if (token) {
          const response = await axios.get(
            "http://192.168.8.102:3000/verify-token",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (response.data.user) {
            setUser({ ...response.data.user, token });
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        await AsyncStorage.removeItem("token");
        setError("La sesión expiró. Por favor ingresa nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (telefono: string, contraseña: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post("http://192.168.8.102:3000/login", {
        telefono,
        contraseña,
      });

      const { token, usuario } = response.data;

      if (!token || !usuario) {
        throw new Error("Respuesta inválida del servidor");
      }

      await AsyncStorage.setItem("token", token);
      // Asegúrate de incluir el token en el objeto usuario
      setUser({ ...usuario, token });
      return { user: { ...usuario, token } };
    } catch (error: any) {
      let errorMessage = "Ocurrió un error al iniciar sesión"; // Mensaje por defecto

      if (error.response) {
        switch (error.response.status) {
          case 400:
            // Para validaciones de entrada (campos faltantes o formato incorrecto)
            errorMessage =
              error.response.data?.error || "Datos de entrada inválidos";
            break;
          case 401:
            // Para credenciales incorrectas
            errorMessage =
              error.response.data?.error || "Contraseña incorrecta";
            break;
          case 404:
            // Para usuario no encontrado
            errorMessage = "Teléfono no registrado";
            break;
          case 500:
            // Para errores internos del servidor
            errorMessage = "Error en el servidor. Intenta más tarde";
            break;
          default:
            // Para cualquier otro código de error
            errorMessage =
              error.response.data?.error ||
              "Error desconocido al iniciar sesión";
        }
      } else if (error.message) {
        errorMessage = error.message.includes("Network Error")
          ? "Problema de conexión. Verifica tu internet"
          : error.message;
      }

      setError(errorMessage);
      return { user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      setUser(null);
      setError(null);
    } catch (error) {
      setError("Error al cerrar sesión");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, error, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
