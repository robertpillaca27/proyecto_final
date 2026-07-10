const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config(); // Carga la variable DATABASE_URL desde tu .env

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. CONFIGURACIÓN DE LA BASE DE DATOS SUPABASE (POSTGRESQL)
// ==========================================
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Requerido para que la conexión a Supabase no sea rechazada
    }
  },
  define: {
    freezeTableName: true // Evita que Sequelize pluralice automáticamente los nombres de las tablas
  }
});

// ==========================================
// 2. DEFINICIÓN DE MODELOS (Respetando las mayúsculas exactas de Supabase)
// ==========================================

// Modelo: Artesania -> Apunta a tu tabla "Artesania"
const Artesania = sequelize.define('Artesania', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING, allowNull: false },
  precio: { type: DataTypes.FLOAT, allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false },
  imagen: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: false });

// Modelo: Usuario -> Apunta a tu tabla "Usuarios"
const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true }
}, { timestamps: false, tableName: 'Usuarios' }); // Forzamos el nombre plural físico que creaste

// Modelo: Pedido -> Apunta a tu tabla "Pedidos"
const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  usuarioId: { type: DataTypes.INTEGER, field: 'usuarioId' },     // Mapea exactamente CamelCase
  artesaniaId: { type: DataTypes.INTEGER, field: 'artesaniaId' }  // Mapea exactamente CamelCase
}, { timestamps: false, tableName: 'Pedidos' });

// ==========================================
// 3. CONFIGURACIÓN DE RELACIONES (Respetando tus CamelCase)
// ==========================================
Usuario.hasMany(Pedido, { foreignKey: 'usuarioId' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuarioId' });

Artesania.hasMany(Pedido, { foreignKey: 'artesaniaId' });
Pedido.belongsTo(Artesania, { foreignKey: 'artesaniaId' });

// ==========================================
// 4. CONEXIÓN E INICIALIZACIÓN
// ==========================================
const conectarBaseDatos = async () => {
  try {
    await sequelize.authenticate();
    console.log('⚡ Conexión exitosa a Supabase (PostgreSQL) con Sequelize.');
    // No usamos sync con force para no alterar los datos que migraste manualmente
    await sequelize.sync({ force: false });
    console.log('📦 Modelos sincronizados correctamente con las tablas existentes.');
  } catch (error) {
    console.error('❌ Error crítico al conectar con Supabase:', error);
  }
};

// ==========================================
// 5. ENDPOINTS REST (100% Compatibles)
// ==========================================

// GET: Obtener artesanías
app.get('/api/artesanias', async (req, res) => {
  try {
    const { provincia } = req.query;
    const condiciones = provincia ? { where: { provincia } } : {};
    const lista = await Artesania.findAll(condiciones);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar el catálogo en Supabase' });
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

// POST: Procesamiento de Compra
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

    // 1. Restar stock
    producto.stock -= cantidad;
    await producto.save();

    // 2. Crear Pedido asociando las llaves foráneas exactas
    const totalVenta = producto.precio * cantidad;
    const nuevoPedido = await Pedido.create({
      cantidad,
      total: totalVenta,
      usuarioId: usuario.id,
      artesaniaId: producto.id
    });

    res.status(201).json({
      mensaje: "Pedido registrado y stock actualizado exitosamente en la nube",
      pedidoId: nuevoPedido.id,
      cliente: usuario.nombre,
      producto: producto.nombre,
      cantidadComprada: cantidad,
      stockRemanente: producto.stock,
      total: totalVenta
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno en la transacción de Supabase' });
  }
});

// ==========================================
// 6. LEVANTAMIENTO DEL SERVIDOR
// ==========================================
const PORT = 4000;
app.listen(PORT, async () => {
  await conectarBaseDatos();
  console.log(`🚀 API corriendo de forma global en http://localhost:${PORT}`);
});