import React, { createContext, useContext, useState, ReactNode } from "react";

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string | null;
  cantidad?: number;
}

interface PlatilloEnCarrito {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: { uri: string }; // ← ya formateada
  cantidad?: number;
}

interface CarritoContextType {
  carrito: PlatilloEnCarrito[];
  agregarAlCarrito: (platillo: PlatilloEnCarrito) => void;
  quitarDelCarrito: (id: number) => void;
  limpiarCarrito: () => void;
  incrementarCantidad: (id: number) => void;
  decrementarCantidad: (id: number) => void; // Add this line
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

export const CarritoProvider = ({ children }: { children: ReactNode }) => {
  const [carrito, setCarrito] = useState<PlatilloEnCarrito[]>([]);

  const agregarAlCarrito = (platillo: PlatilloEnCarrito) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === platillo.id);
      if (existente) {
        return prev.map((item) =>
          item.id === platillo.id
            ? { ...item, cantidad: (item.cantidad || 1) + 1 }
            : item
        );
      } else {
        return [...prev, { ...platillo, cantidad: 1 }];
      }
    });
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const limpiarCarrito = () => {
    setCarrito([]);
  };
  const incrementarCantidad = (id: number) => {
    setCarrito((prev) => {
      return prev.map((item) =>
        item.id === id ? { ...item, cantidad: (item.cantidad || 1) + 1 } : item
      );
    });
  };

  const decrementarCantidad = (id: number) => {
    setCarrito((prev) => {
      return prev.map((item) =>
        item.id === id ? { ...item, cantidad: (item.cantidad || 1) - 1 } : item
      );
    });
  };
  return (
    <CarritoContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        quitarDelCarrito,
        limpiarCarrito,
        incrementarCantidad,
        decrementarCantidad,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
};

export const useCarrito = () => {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error("useCarrito debe usarse dentro de un CarritoProvider");
  }
  return context;
};
