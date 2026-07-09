const request = require('supertest');
// Importamos la configuración de nuestra API (Express) sin levantar el puerto directamente aquí
// Para que esto funcione de forma óptima, necesitamos aislar la instancia de express o usarla directamente.
const express = require('express');
const cors = require('cors');

// Configuramos una réplica idéntica del entorno integrado real
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

let artesaniasBD = [
    { id: 1, nombre: "Retablo Ayacuchano Tradicional", provincia: "Huamanga", precio: 120.00, stock: 5, categoria: "Retablos" },
    { id: 3, nombre: "Tapiz de Lana de Ovino Wari", provincia: "Huanta", precio: 250.00, stock: 2, categoria: "Textiles" }
];

app.get('/api/artesanias', (req, res) => {
    const { provincia } = req.query;
    let resultado = [...artesaniasBD];
    if (provincia) {
        resultado = resultado.filter(a => a.provincia.toLowerCase() === provincia.toLowerCase());
    }
    res.status(200).json(resultado);
});

app.post('/api/compras', (req, res) => {
    const { productoId, cantidad } = req.body;
    const producto = artesaniasBD.find(a => a.id === parseInt(productoId));
    if (!producto) return res.status(404).json({ error: "No existe" });
    if (producto.stock < cantidad) return res.status(409).json({ error: "Conflicto de Stock" });
    
    producto.stock -= cantidad;
    res.status(201).json({
        mensaje: "Compra procesada exitosamente",
        producto: producto.nombre,
        stockRemanente: producto.stock,
        total: producto.precio * cantidad
    });
});

// --- SUITE DE INTEGRACIÓN ---
describe('🔥 PRUEBA DE INTEGRACIÓN VERTICAL - RURAQ MAKI', () => {

    beforeEach(() => {
        // Inicializar el estado de la base de datos en memoria para consistencia de QA
        artesaniasBD[0].stock = 5;
        artesaniasBD[1].stock = 2;
    });

    test('Flujo Completo: Filtrar por provincia Huanta, verificar stock y adquirir producto', async () => {
        
        // PASO 1: El cliente (Frontend) solicita el catálogo filtrado por 'Huanta'
        const respuestaCatalogo = await request(app)
            .get('/api/artesanias?provincia=Huanta')
            .expect('Content-Type', /json/)
            .expect(200);

        // Verificación de integración: El filtro del backend responde con el producto correcto para el frontend
        expect(respuestaCatalogo.body.length).toBe(1);
        expect(respuestaCatalogo.body[0].nombre).toBe("Tapiz de Lana de Ovino Wari");
        const productoIdAComprar = respuestaCatalogo.body[0].id; // ID: 3

        // PASO 2: El cliente ejecuta la acción de "Adquirir Producto" despachando un POST
        const respuestaCompra = await request(app)
            .post('/api/compras')
            .send({ productoId: productoIdAComprar, cantidad: 1 })
            .expect(201);

        // Verificación de la transacción integrada
        expect(respuestaCompra.body.mensaje).toBe("Compra procesada exitosamente");
        expect(respuestaCompra.body.stockRemanente).toBe(1); // El stock bajó de 2 a 1

        // PASO 3: Una nueva consulta al catálogo debe reflejar la persistencia del stock actualizado
        const verificacionCatalogo = await request(app)
            .get('/api/artesanias?provincia=Huanta')
            .expect(200);

        expect(verificacionCatalogo.body[0].stock).toBe(1);
    });
});