const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. CONFIGURACIÓN DE LA BASE DE DATOS SQLITE
// ==========================================
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Se crea el archivo físico en la carpeta backend/
  logging: false
});

// ==========================================
// 2. DEFINICIÓN DE MODELOS (TABLAS)
// ==========================================

// Modelo existente: Artesania
const Artesania = sequelize.define('Artesania', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING, allowNull: false },
  precio: { type: DataTypes.FLOAT, allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false },
  imagen: { type: DataTypes.STRING, allowNull: false }, // Atributo obligatorio
}, { timestamps: false });

// Modelo de Usuario / Cliente
const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { timestamps: false });

// Modelo de Pedido / Venta (Historial)
const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { timestamps: false });

// ==========================================
// 3. CONFIGURACIÓN DE RELACIONES (1 A MUCHOS)
// ==========================================
Usuario.hasMany(Pedido, { foreignKey: 'usuarioId' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuarioId' });

Artesania.hasMany(Pedido, { foreignKey: 'artesaniaId' });
Pedido.belongsTo(Artesania, { foreignKey: 'artesaniaId' });

// ==========================================
// 4. INICIALIZACIÓN DE DATOS SEMILLA (SEED) PERSISTENTE
// ==========================================
const inicializarBaseDatos = async () => {
  // force: false evita que se limpie la BD en cada reinicio
  await sequelize.sync({ force: false }); 
  
  const conteoUsuarios = await Usuario.count();
  const conteoArtesanias = await Artesania.count();

  if (conteoUsuarios === 0 && conteoArtesanias === 0) {
    console.log('🌱 Base de datos vacía. Inyectando datos semilla iniciales...');

    // 1. Inyectar Usuarios Semilla
    const user1 = await Usuario.create({ nombre: 'Robert Pillaca', email: 'robert@unsch.edu.pe' });
    const user2 = await Usuario.create({ nombre: 'Gian Carlos', email: 'gian@unsch.edu.pe' });

    // 2. Inyectar Artesanías Semilla con sus respectivas URLs de imagen obligatorias
    const art1 = await Artesania.create({ 
      nombre: 'Tapiz de Lana de Ovino Wari', 
      provincia: 'Huanta', 
      precio: 120.00, 
      stock: 2,
      imagen: 'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=600&q=80'
    });
    const art2 = await Artesania.create({ 
      nombre: 'Retablo Ayacuchano Tradicional', 
      provincia: 'Huamanga', 
      precio: 180.50, 
      stock: 5,
      imagen: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?auto=format&fit=crop&w=600&q=80'
    });
    const art3 = await Artesania.create({ 
      nombre: 'Cerámica de Quinua (Iglesia)', 
      provincia: 'Huamanga', 
      precio: 45.00, 
      stock: 3,
      imagen: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80'
    });
    const art4 = await Artesania.create({ 
      nombre: 'Piedra de Huamanga Esculptada', 
      provincia: 'Huamanga', 
      precio: 90.00, 
      stock: 0,
      imagen: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80'
    });

    // 3. Inyectar una Venta Semilla de ejemplo
    await Pedido.create({
      cantidad: 1,
      total: 120.00,
      usuarioId: user1.id,
      artesaniaId: art1.id
    });
    
    console.log('📦 Datos semilla insertados con éxito.');
  } else {
    console.log('📦 Base de datos SQLite preservada con éxito. Conservando transacciones y stock actual.');
  }
};

// ==========================================
// 5. ENDPOINTS REST REFACTORIZADOS
// ==========================================

// GET: Obtener artesanías
app.get('/api/artesanias', async (req, res) => {
  try {
    const { provincia } = req.query;
    const condiciones = provincia ? { where: { provincia } } : {};
    const lista = await Artesania.findAll(condiciones);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el catálogo' });
  }
});

// GET: Obtener todos los usuarios registrados
app.get('/api/usuarios', async (req, res) => {
  try {
    const listaUsuarios = await Usuario.findAll({ order: [['id', 'ASC']] });
    res.json(listaUsuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la lista de usuarios' });
  }
});

// GET: Obtener el historial de pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const historial = await Pedido.findAll({
      include: [
        { model: Usuario, attributes: ['nombre', 'email'] },
        { model: Artesania, attributes: ['nombre', 'precio'] }
      ]
    });
    res.json(historial);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el historial de pedidos' });
  }
});

// POST: Procesamiento de Compra adaptado al flujo Multi-Tabla
app.post('/api/compras', async (req, res) => {
  const { artesaniaId, usuarioId, cantidad } = req.body;

  try {
    const producto = await Artesania.findByPk(artesaniaId);
    const usuario = await Usuario.findByPk(usuarioId);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (producto.stock < cantidad) {
      return res.status(409).json({ error: 'Conflicto de Stock: Existencias insuficientes' });
    }

    // 1. Mutación e impacto atómico en el stock del producto
    producto.stock -= cantidad;
    await producto.save();

    // 2. Persistencia automática del registro en la tabla transaccional Pedidos
    const totalVenta = producto.precio * cantidad;
    const nuevoPedido = await Pedido.create({
      cantidad,
      total: totalVenta,
      usuarioId: usuario.id,
      artesaniaId: producto.id
    });

    res.status(201).json({
      mensaje: "Pedido registrado y stock actualizado exitosamente",
      pedidoId: nuevoPedido.id,
      cliente: usuario.nombre,
      producto: producto.nombre,
      cantidadComprada: cantidad,
      stockRemanente: producto.stock,
      total: totalVenta
    });

  } catch (error) {
    res.status(500).json({ error: 'Error interno en la transacción' });
  }
});

// ==========================================
// 6. LEVANTAMIENTO DEL SERVIDOR
// ==========================================
const PORT = 4000;
app.listen(PORT, async () => {
  await inicializarBaseDatos();
  console.log(`🚀 API corriendo de forma global en http://localhost:${PORT}`);
});