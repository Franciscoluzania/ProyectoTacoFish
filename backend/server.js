require("dotenv").config({ path: ".env" });
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const twilio = require('twilio');
const os = require('os');
const app = express();

// Inicialización de Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Configuración CORS actualizada
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}),);
app.use('/uploads', express.static('C:/ProgramData/MySQL/MySQL Server 8.0/Uploads'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
// Configuración de la base de datos MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER || "francisco",
  password: process.env.DB_PASSWORD || "admin123",
  database: process.env.DB_NAME || "Restaurante",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión a la base de datos
db.getConnection()
  .then((connection) => {
    console.log("✅ Conectado a la base de datos MySQL");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Error al conectar a la base de datos:", err.message);
    process.exit(1);
  });

const SECRET_KEY = process.env.JWT_SECRET || "secreto_super_seguro";
const verificationCodes = {};

// Middleware de autenticación
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Función para formatear teléfono
const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) {
    throw new Error("El número de teléfono debe tener 10 dígitos");
  }
  return `+52${cleaned}`;
};

// Ruta de registro
app.post("/registro", async (req, res) => {
  try {
    const { nombre, telefono, contraseña, confirmarContraseña } = req.body;

    // Validaciones básicas
    if (!nombre || !telefono || !contraseña || !confirmarContraseña) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    if (contraseña !== confirmarContraseña) {
      return res.status(400).json({ error: "Las contraseñas no coinciden" });
    }

    const formattedTelefono = formatPhoneNumber(telefono);

    // Verificar si el usuario ya existe
    const [usuarioExistente] = await db.query(
      "SELECT id FROM usuarios WHERE telefono = ?",
      [formattedTelefono]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({ 
        error: "Este número de teléfono ya está registrado" 
      });
    }

    // Generar código de verificación
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Enviar SMS con Twilio
    try {
      await client.messages.create({
        body: `Tu código de verificación es: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedTelefono
      });
    } catch (twilioError) {
      console.error("Error de Twilio:", twilioError);
      return res.status(500).json({
        error: "Error al enviar SMS",
        details: twilioError.code === 21211 ? "Número inválido" : "Intenta más tarde"
      });
    }

    // Guardar datos para verificación
    verificationCodes[formattedTelefono] = {
      code: verificationCode,
      userData: { nombre, contraseña },
      timestamp: Date.now()
    };

    res.status(200).json({ 
      message: "Código de verificación enviado", 
      telefono: formattedTelefono 
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message 
    });
  }
});

// Ruta de verificación
app.post("/verificar-codigo", async (req, res) => {
  try {
    const { telefono, codigo } = req.body;

    if (!telefono || !codigo) {
      return res.status(400).json({ error: "Teléfono y código son requeridos" });
    }

    const storedData = verificationCodes[telefono];
    
    if (!storedData || storedData.code !== codigo) {
      return res.status(400).json({ error: "Código de verificación inválido" });
    }

    // Verificar expiración (5 minutos)
    if (Date.now() - storedData.timestamp > 300000) {
      delete verificationCodes[telefono];
      return res.status(400).json({ error: "Código expirado" });
    }

    // Hashear contraseña y crear usuario
    const hashedPassword = await bcrypt.hash(storedData.userData.contraseña, 10);
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, telefono, contraseña) VALUES (?, ?, ?)",
      [storedData.userData.nombre, telefono, hashedPassword]
    );

    // Generar token JWT
    const token = jwt.sign(
      { id: result.insertId, telefono },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    delete verificationCodes[telefono];

    res.status(201).json({ 
      message: "Usuario registrado exitosamente",
      token,
      usuario: {
        id: result.insertId,
        nombre: storedData.userData.nombre,
        telefono
      }
    });

  } catch (error) {
    console.error("Error en verificación:", error);
    res.status(500).json({ 
      error: "Error al completar el registro",
      details: error.message 
    });
  }
});

// Ruta de login
app.post("/login", async (req, res) => {
  try {
    const { telefono, contraseña } = req.body;

    console.log("Datos recibidos en /login:", { telefono, contraseña });

    // Validación de campos faltantes
    if (!telefono && !contraseña) {
      return res.status(400).json({ error: "Teléfono y contraseña son requeridos" });
    }
    if (!telefono) {
      return res.status(400).json({ error: "Teléfono es requerido" });
    }
    if (!contraseña) {
      return res.status(400).json({ error: "Contraseña es requerida" });
    }

    // Validación de formato de teléfono
    const cleanedTelefono = telefono.replace(/\D/g, "");
    if (cleanedTelefono.length !== 10) {
      return res.status(400).json({ error: "El teléfono debe tener 10 dígitos" });
    }

    const formattedTelefono = `+52${cleanedTelefono}`;
    console.log("Teléfono formateado:", formattedTelefono);

    // Buscar usuario en la base de datos
    const [users] = await db.query(
      "SELECT * FROM usuarios WHERE telefono = ?",
      [formattedTelefono]
    );

    console.log("Resultado de la consulta a la base de datos:", users);

    if (users.length === 0) {
      return res.status(404).json({ error: "El teléfono no está registrado" });
    }

    const usuario = users[0];
    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);

    console.log("Contraseña válida:", contraseñaValida);

    if (!contraseñaValida) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        telefono: usuario.telefono,
        tipo_usuario: usuario.tipo_usuario,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    console.log("Token generado:", token);

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        telefono: usuario.telefono,
        tipo_usuario: usuario.tipo_usuario,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta para verificar token
app.get("/verify-token", authenticate, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, nombre, telefono, tipo_usuario FROM usuarios WHERE id = ?",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      message: "Token válido",
      usuario: users[0]
    });

  } catch (error) {
    console.error("Error en verify-token:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.get("/usuarios", (req, res) => {
  db.execute("SELECT * FROM usuarios")
    .then(([rows, fields]) => {
      res.json(rows); // Devolver los resultados como JSON
    })
    .catch((err) => {
      console.error("❌ Error al obtener usuarios:", err.message);
      res.status(500).send("Error al obtener usuarios");
    });
});
// POST: Crear nuevo usuario
// Ruta para agregar un nuevo usuario
app.post("/usuarios", express.json(), (req, res) => {
  const { nombre, contraseña, telefono, tipo_usuario } = req.body;
  
  // Verificar que se reciban todos los campos
  if (!nombre || !contraseña || !telefono || !tipo_usuario) {
    return res.status(400).send("Faltan datos requeridos");
  }

  const query = "INSERT INTO usuarios (nombre, contraseña, telefono, tipo_usuario) VALUES (?, ?, ?, ?)";
  
  db.execute(query, [nombre, contraseña, telefono, tipo_usuario])
    .then(([result]) => {
      res.status(201).send(`Usuario creado con ID: ${result.insertId}`);
    })
    .catch((err) => {
      console.error("❌ Error al agregar usuario:", err.message);
      res.status(500).send("Error al agregar usuario");
    });
});
// Crear un nuevo pedido
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log("📥 Body recibido:", req.body);

    const {
      carrito,
      total,
      metodo_pago,
      comprobanteBase64,
      comprobanteMime,
      user_id,         // user_id desde frontend
      cliente_anonimo  // identificador string si no hay user logueado
    } = req.body;

    // Validación básica
    if (!carrito || !Array.isArray(carrito) || carrito.length === 0) {
      console.warn("❌ Carrito vacío o inválido");
      return res.status(400).json({ message: 'Carrito vacío o inválido' });
    }
    if (!total || !metodo_pago) {
      console.warn("❌ Falta total o método de pago");
      return res.status(400).json({ message: 'Falta total o método de pago' });
    }
    if (!user_id && !cliente_anonimo) {
      console.warn("❌ Falta user_id o cliente_anonimo");
      return res.status(400).json({ message: 'Falta user_id o cliente_anonimo' });
    }

    // Procesar imagen comprobante (opcional)
    let comprobanteBuffer = null;
    if (comprobanteBase64) {
      comprobanteBuffer = Buffer.from(comprobanteBase64, 'base64');
      console.log("📷 Comprobante convertido a buffer. Tamaño:", comprobanteBuffer.length);
    } else {
      console.log("📷 Sin comprobante recibido.");
    }

    // Insertar pedido
    const [result] = await db.query(
      `INSERT INTO pedidos (usuario_id, cliente_anonimo, metodo_pago, total, comprobante, comprobante_mime)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id || null, cliente_anonimo || null, metodo_pago, total, comprobanteBuffer, comprobanteMime || null]
    );
    const pedidoId = result.insertId;
    console.log("✅ Pedido insertado con ID:", pedidoId);

    // Insertar detalles del pedido
    const detalleValues = carrito.map(item => [pedidoId, item.id, item.cantidad || 1]);
    if (detalleValues.length > 0) {
      await db.query(
        `INSERT INTO pedido_detalle (pedido_id, platillo_id, cantidad) VALUES ?`,
        [detalleValues]
      );
      console.log("✅ Detalles del pedido insertados.");
    } else {
      console.warn("⚠️ No se insertaron detalles porque el carrito está vacío");
    }

    // Obtener info usuario si user_id existe y no es anónimo
    let usuario = null;
    if (user_id) {
      const [usuarioRows] = await db.query(
        `SELECT id, nombre FROM usuarios WHERE id = ? AND es_anonimo = 0`,
        [user_id]
      );
      if (usuarioRows.length > 0) {
        usuario = usuarioRows[0];
      }
    }

    return res.status(201).json({
      message: "Pedido registrado con éxito",
      pedido_id: pedidoId,
      usuario: usuario || { anonimo: true, identificador: cliente_anonimo }
    });

  } catch (error) {
    console.error("❌ Error al procesar el pedido:", error);
    return res.status(500).json({ message: "Error del servidor" });
  }
});
app.get('/api/pedidos', async (req, res) => {
  try {
    // Traer todos los pedidos con usuario y detalles
    const [pedidosRows] = await db.query(`
      SELECT p.id, p.usuario_id, p.cliente_anonimo, p.metodo_pago, p.total, p.comprobante, p.comprobante_mime,
             u.nombre AS usuario_nombre
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.id DESC
    `);

    // Para cada pedido traer los detalles
    const pedidosConDetalles = await Promise.all(pedidosRows.map(async pedido => {
      // Obtener detalles del pedido
      const [detalles] = await db.query(`
        SELECT platillo_id, cantidad FROM pedido_detalle WHERE pedido_id = ?
      `, [pedido.id]);

      // Convertir comprobante BLOB a base64 para enviar como string
      let comprobanteBase64 = null;
      if (pedido.comprobante) {
        comprobanteBase64 = Buffer.from(pedido.comprobante).toString('base64');
      }

      return {
        id: pedido.id,
        usuario: pedido.usuario_id ? { id: pedido.usuario_id, nombre: pedido.usuario_nombre } : { anonimo: true, identificador: pedido.cliente_anonimo },
        metodo_pago: pedido.metodo_pago,
        total: pedido.total,
        comprobante: comprobanteBase64 ? `data:${pedido.comprobante_mime};base64,${comprobanteBase64}` : null,
        detalles: detalles.map(d => ({ platillo_id: d.platillo_id, cantidad: d.cantidad })),
      };
    }));

    res.json(pedidosConDetalles);

  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});



// Obtener un pedido por ID
app.get('/api/pedidos/:id', async (req, res) => {
  const pedidoId = req.params.id;
  try {
    console.log("Buscando pedido ID:", pedidoId);

    const [[pedido]] = await db.query(
      `SELECT id, metodo_pago, total, estado, fecha 
       FROM pedidos 
       WHERE id = ?`,
      [pedidoId]
    );

    if (!pedido) {
      console.log("Pedido no encontrado:", pedidoId);
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    console.log("Pedido encontrado:", pedido);

    const [detalle] = await db.query(
      `SELECT platillo_id, cantidad 
       FROM pedido_detalle 
       WHERE pedido_id = ?`,
      [pedidoId]
    );

    console.log("Detalle obtenido:", detalle.length);
    res.json({ pedido, detalle });
  } catch (error) {
    console.error("Error en GET /api/pedidos/:id:", error);
    res.status(500).json({ message: 'Error al obtener pedido' });
  }
});

// Obtener el comprobante de un pedido
app.get('/api/pedidos/:id/comprobante', async (req, res) => {
  const pedidoId = req.params.id;
  try {
    console.log("Solicitando comprobante para pedido ID:", pedidoId);

    const [rows] = await db.query(
      `SELECT comprobante, comprobante_mime 
       FROM pedidos 
       WHERE id = ?`,
      [pedidoId]
    );

    if (rows.length === 0 || !rows[0].comprobante) {
      console.log("No se encontró comprobante para pedido ID:", pedidoId);
      return res.status(404).send('No se encontró comprobante');
    }

    console.log("Enviando comprobante, tipo MIME:", rows[0].comprobante_mime);
    res.setHeader('Content-Type', rows[0].comprobante_mime || 'image/jpeg');
    res.send(rows[0].comprobante);
  } catch (error) {
    console.error("Error en GET /api/pedidos/:id/comprobante:", error);
    res.status(500).send('Error al obtener imagen');
  }
});

app.get("/api/pedidos", (req, res) => {
  const sql = `
    SELECT 
      id, 
      metodo_pago, 
      total, 
      fecha, 
      estado 
    FROM pedidos 
    ORDER BY fecha DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al obtener pedidos" });
    }
    res.json(results);
  });
});
app.get("/api/pedidos/:id/comprobante", (req, res) => {
  const pedidoId = req.params.id;
  const sql = "SELECT comprobante, comprobante_mime FROM pedidos WHERE id = ?";
  db.query(sql, [pedidoId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send("Comprobante no encontrado");
    }

    const { comprobante, comprobante_mime } = results[0];
    res.setHeader("Content-Type", comprobante_mime);
    res.send(comprobante);
  });
});


// Actualizar estado de un pedido
app.patch("/api/pedidos/:id/estado", (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const estadosValidos = ["en_proceso", "realizado", "cancelado"];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: "Estado no válido" });
  }

  const sql = "UPDATE pedidos SET estado = ? WHERE id = ?";
  db.query(sql, [estado, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al actualizar estado" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    res.json({ message: "Estado actualizado correctamente" });
  });
});


// PUT: Actualizar un usuario por ID
app.put('/usuarios/:id', async (req, res) => {
  const { nombre, contraseña, telefono, tipo_usuario } = req.body;
  const { id } = req.params;

  try {
    let query = '';
    let params = [];

    if (contraseña && contraseña.trim() !== '') {
      // Si se proporciona nueva contraseña, la hasheamos
      const hashedPassword = await bcrypt.hash(contraseña, 10);
      query = `
        UPDATE usuarios 
        SET nombre = ?, contraseña = ?, telefono = ?, tipo_usuario = ? 
        WHERE id = ?`;
      params = [nombre, hashedPassword, telefono, tipo_usuario, id];
    } else {
      // Si no se proporciona contraseña, no la actualizamos
      query = `
        UPDATE usuarios 
        SET nombre = ?, telefono = ?, tipo_usuario = ? 
        WHERE id = ?`;
      params = [nombre, telefono, tipo_usuario, id];
    }

    db.query(query, params, (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Usuario actualizado correctamente' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});


app.delete("/usuarios/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


app.get("/categorias", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, nombre, imagen
      FROM categoria
    `);

    const categoriasConImagen = rows.map((categoria) => {
      let imagenBase64 = null;
      if (categoria.imagen && categoria.imagen instanceof Buffer) {
        imagenBase64 = categoria.imagen.toString('base64');
      }

      return {
        ...categoria,
        imagen: imagenBase64, // Imagen convertida a base64
      };
    });

    res.json(categoriasConImagen);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});


// Obtener platillos por categoría
app.get('/categorias/:id/platillos', async (req, res) => {
  try {
    console.log(`[API] Fetching platillos for categoria ID: ${req.params.id}`);
    
    // 1. Obtener platillos de la base de datos
    const [platillos] = await db.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.categoria_id,
        p.imagen,
        c.nombre AS categoria_nombre 
      FROM platillo p
      JOIN categoria c ON p.categoria_id = c.id
      WHERE p.categoria_id = ?
    `, [req.params.id]);

    // 2. Procesar las imágenes correctamente
    const platillosFormateados = platillos.map(platillo => {
      // Verificar si la imagen es un Buffer válido
      let imagenBase64 = null;
      if (platillo.imagen && Buffer.isBuffer(platillo.imagen)) {
        try {
          imagenBase64 = platillo.imagen.toString('base64');
        } catch (error) {
          console.error('Error converting image to base64:', error);
        }
      }

      return {
        id: platillo.id,
        nombre: platillo.nombre,
        descripcion: platillo.descripcion,
        precio: platillo.precio,
        imagen: imagenBase64, // Puede ser null si no hay imagen válida
        categoria: {
          id: platillo.categoria_id,
          nombre: platillo.categoria_nombre
        }
      };
    });

    console.log('[API] First platillo sample:', {
      ...platillosFormateados[0],
      imagen: platillosFormateados[0]?.imagen ? '[BASE64_DATA]' : null
    });

    res.json(platillosFormateados);
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener platillos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener todos los platillos
app.get("/platillos", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, 
             p.categoria_id, c.nombre AS categoria
      FROM platillo p
      JOIN categoria c ON p.categoria_id = c.id
    `);

    const platillosConImagen = rows.map((platillo) => {
      let imagenBase64 = null;

      // Convertimos el buffer a base64, si existe
      if (platillo.imagen) {
        imagenBase64 = Buffer.from(platillo.imagen).toString("base64");
      }

      return {
        ...platillo,
        imagen: imagenBase64,
      };
    });

    res.json(platillosConImagen);
  } catch (error) {
    console.error("Error al obtener platillos:", error);
    res.status(500).json({ error: "Error al obtener platillos" });
  }
});


// Endpoint para obtener calificaciones de un platillo
app.get('/platillos/:id/calificaciones', async (req, res) => {
  try {
    const platilloId = req.params.id;
    
    // Verificar si el platillo existe
    const [platillo] = await db.query('SELECT id FROM platillo WHERE id = ?', [platilloId]);
    
    if (platillo.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Platillo no encontrado' 
      });
    }

    // Obtener calificaciones con información del usuario
    const [calificaciones] = await db.query(`
      SELECT 
        cp.id,
        cp.usuario_id,
        cp.platillo_id,
        cp.calificacion,
        cp.comentario,
        DATE_FORMAT(cp.fecha_calificacion, '%Y-%m-%d %H:%i:%s') as fecha_calificacion,
        u.nombre as usuario_nombre,
        DATE_FORMAT(cp.fecha_calificacion, '%d/%m/%Y') as fecha_formateada
      FROM calificaciones_platillos cp
      JOIN usuarios u ON cp.usuario_id = u.id
      WHERE cp.platillo_id = ?
      ORDER BY cp.fecha_calificacion DESC
    `, [platilloId]);

    // Calcular promedio y total
    const [stats] = await db.query(`
      SELECT 
        AVG(calificacion) as promedio,
        COUNT(*) as total
      FROM calificaciones_platillos
      WHERE platillo_id = ?
    `, [platilloId]);

    res.json({
      success: true,
      calificaciones: calificaciones,
      promedio: stats[0].promedio ? parseFloat(stats[0].promedio).toFixed(1) : "0.0",
      total: stats[0].total || 0
    });

  } catch (error) {
    console.error('Error en GET /platillos/:id/calificaciones:', error);
    console.error('Error detalles:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener calificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para agregar/actualizar calificación
app.post('/platillos/:id/calificaciones', authenticate, async (req, res) => {
  const platilloId = req.params.id;
  const { calificacion, comentario } = req.body;
  const usuario_id = req.user.id;

  console.log('Datos recibidos:', { usuario_id, calificacion, platilloId, comentario });

  // Validación de campos requeridos
  if (calificacion === undefined || !platilloId) {
    return res.status(400).json({ 
      success: false,
      error: 'Calificación y platillo ID son requeridos' 
    });
  }

  // Validación del formato de la calificación
  const calificacionEntera = Math.round(Number(calificacion));
  if (isNaN(calificacionEntera) || calificacionEntera < 1 || calificacionEntera > 5) {
    return res.status(400).json({ 
      success: false,
      error: 'La calificación debe ser un número entero entre 1 y 5' 
    });
  }

  let connection;
  try {
    connection = await db.getConnection();

    // 1. Verificar existencia del platillo
    const [platillo] = await connection.query(
      'SELECT * FROM platillo WHERE id = ?', 
      [platilloId]
    );
    
    if (platillo.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Platillo no encontrado' 
      });
    }

    // 2. Verificar si ya existe una calificación del usuario para este platillo
    const [existente] = await connection.query(
      'SELECT * FROM calificaciones_platillos WHERE usuario_id = ? AND platillo_id = ?',
      [usuario_id, platilloId]
    );

    if (existente.length > 0) {
      // Actualizar calificación existente
      await connection.query(
        'UPDATE calificaciones_platillos SET calificacion = ?, comentario = ?, fecha_calificacion = CURRENT_TIMESTAMP WHERE usuario_id = ? AND platillo_id = ?',
        [calificacionEntera, comentario || null, usuario_id, platilloId]
      );
    } else {
      // Insertar nueva calificación
      await connection.query(
        'INSERT INTO calificaciones_platillos (usuario_id, platillo_id, calificacion, comentario) VALUES (?, ?, ?, ?)',
        [usuario_id, platilloId, calificacionEntera, comentario || null]
      );
    }

    // 3. Obtener los datos actualizados para la respuesta
    const [calificacionActualizada] = await connection.query(
      `SELECT 
        cp.*, 
        u.nombre as usuario_nombre,
        p.nombre as platillo_nombre,
        DATE_FORMAT(cp.fecha_calificacion, '%d %b %Y') as fecha_formateada
      FROM calificaciones_platillos cp
      JOIN usuarios u ON cp.usuario_id = u.id
      JOIN platillo p ON cp.platillo_id = p.id
      WHERE cp.usuario_id = ? AND cp.platillo_id = ?`,
      [usuario_id, platilloId]
    );

    return res.status(existente.length > 0 ? 200 : 201).json({
      success: true,
      data: calificacionActualizada[0],
      message: existente.length > 0 
        ? 'Calificación actualizada exitosamente' 
        : 'Calificación registrada exitosamente'
    });

  } catch (error) {
    console.error('Error en el servidor:', {
      message: error.message,
      stack: error.stack,
      ...(error.code && { code: error.code }),
      ...(error.errno && { errno: error.errno }),
      ...(error.sqlMessage && { sqlMessage: error.sqlMessage }),
      ...(error.sql && { sql: error.sql })
    });

    // Manejo de errores específicos de MySQL
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'No puedes calificar el mismo platillo más de una vez'
      });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({
        success: false,
        error: 'Usuario o platillo no existe'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });

  } finally {
    if (connection) connection.release();
  }
});

// Endpoint para borrar calificación
app.delete('/calificaciones/:id', authenticate, async (req, res) => {
  try {
    const calificacionId = req.params.id;
    const usuarioId = req.user.id;

    // Verificar que la calificación pertenece al usuario
    const [calificacion] = await db.query(`
      SELECT id FROM calificaciones_platillos 
      WHERE id = ? AND usuario_id = ?
    `, [calificacionId, usuarioId]);

    if (calificacion.length === 0) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [result] = await db.query(`
      DELETE FROM calificaciones_platillos 
      WHERE id = ?
    `, [calificacionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Calificación no encontrada' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al borrar calificación' });
  }
});

app.get("/platillos/mejores", async (req, res) => {
  try {
    // Verificar si hay calificaciones registradas
    const [hasRatings] = await db.query(
      "SELECT COUNT(*) as count FROM calificaciones_platillos"
    );

    if (hasRatings[0].count === 0) {
      // Si no hay calificaciones, retornar 5 platillos aleatorios
      const [randomDishes] = await db.query(`
        SELECT 
          p.id,
          p.nombre,
          p.descripcion,
          p.precio,
          p.imagen,
          0 AS promedio_calificacion,
          0 AS numero_calificaciones
        FROM platillo p
        ORDER BY RAND()
        LIMIT 5
      `);

      const platillosConImagen = randomDishes.map((platillo) => ({
        id: platillo.id,
        nombre: platillo.nombre,
        descripcion: platillo.descripcion,
        precio: platillo.precio,
        promedio_calificacion: 0,
        numero_calificaciones: 0,
        imagen:
          platillo.imagen && Buffer.isBuffer(platillo.imagen)
            ? `data:image/jpeg;base64,${platillo.imagen.toString("base64")}`
            : null,
        mensaje: "No hay suficientes calificaciones, mostrando platillos aleatorios",
      }));

      return res.json(platillosConImagen);
    }

    // Si hay calificaciones, obtener los mejores platillos
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.imagen,
        ROUND(AVG(cp.calificacion), 2) AS promedio_calificacion,
        COUNT(cp.id) AS numero_calificaciones
      FROM platillo p
      JOIN calificaciones_platillos cp ON p.id = cp.platillo_id
      GROUP BY p.id
      HAVING numero_calificaciones > 0
      ORDER BY promedio_calificacion DESC, numero_calificaciones DESC
      LIMIT 5
    `);

    const platillosConImagen = rows.map((platillo) => ({
      id: platillo.id,
      nombre: platillo.nombre,
      descripcion: platillo.descripcion,
      precio: platillo.precio,
      promedio_calificacion: platillo.promedio_calificacion,
      numero_calificaciones: platillo.numero_calificaciones,
      imagen:
        platillo.imagen && Buffer.isBuffer(platillo.imagen)
          ? `data:image/jpeg;base64,${platillo.imagen.toString("base64")}`
          : null,
    }));

    return res.json(platillosConImagen);
  } catch (error) {
    console.error("Error al obtener los platillos mejor calificados:", error);
    return res.status(500).json({
      error: "Error al obtener los platillos mejor calificados",
      detalle: error.message,
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIp = '0.0.0.0';
  
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
        localIp = iface.address;
      }
    });
  });

  console.log(`
  🚀 Servidor funcionando en:
  - Local:    http://localhost:${PORT}
  - Red:      http://${localIp}:${PORT}
  
  📡 Endpoints:
  - POST /registro
  - POST /verificar-codigo
  - POST /login
  - GET  /verify-token
  `);
});