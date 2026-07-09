const request = require('supertest');
const express = require('express');

// Simulamos la app de Express para aislar las pruebas unitarias
const app = express();
app.use(express.json());

let artesaniasPrueba = [
    { id: 1, nombre: "Retablo Tradicional", provincia: "Huamanga", precio: 120.00, stock: 5 },
    { id: 2, nombre: "Piedra Huamanga Tallada", provincia: "Huamanga", precio: 45.00, stock: 0 }
];

// Rutas espejo para la evaluación unitaria
app.get('/api/artesanias', (req, res) => {
    const { provincia } = req.query;
    let resultado = [...artesaniasPrueba];
    if (provincia) {
        resultado = resultado.filter(a => a.provincia.toLowerCase() === provincia.toLowerCase());
    }
    res.status(200).json(resultado);
});

app.post('/api/compras', (req, res) => {
    const { productoId, cantidad } = req.body;
    const producto = artesaniasPrueba.find(a => a.id === parseInt(productoId));
    if (!producto) return res.status(404).json({ error: "No existe" });
    if (producto.stock < cantidad) return res.status(409).json({ error: "Conflicto de Stock" });
    
    producto.stock -= cantidad;
    res.status(201).json({ producto: producto.nombre, stockRemanente: producto.stock });
});

// SUITE DE PRUEBAS ISO/IEC/IEEE 29119
describe('Pruebas Unitarias Backend - API Marketplace', () => {
    
    beforeEach(() => {
        // Restablecemos el stock inicial antes de cada prueba
        artesaniasPrueba[0].stock = 5;
        artesaniasPrueba[1].stock = 0;
    });

    test('Debería retornar todas las artesanías disponibles sin filtros aplicados', async () => {
        const respuesta = await request(app).get('/api/artesanias');
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.length).toBe(2);
    });

    test('Debería filtrar correctamente las artesanías por criterio de Provincia', async () => {
        const respuesta = await request(app).get('/api/artesanias?provincia=Huamanga');
        expect(respuesta.statusCode).toBe(200);
        expect(respuesta.body.every(art => art.provincia === 'Huamanga')).toBe(true);
    });

    test('Debería procesar con éxito una adquisición reduciendo el inventario remanente', async () => {
        const respuesta = await request(app)
            .post('/api/compras')
            .send({ productoId: 1, cantidad: 1 });
            
        expect(respuesta.statusCode).toBe(201);
        expect(respuesta.body.stockRemanente).toBe(4);
    });

    test('Debería rechazar la transacción con un código 409 si el stock disponible es insuficiente', async () => {
        const respuesta = await request(app)
            .post('/api/compras')
            .send({ productoId: 2, cantidad: 1 });
            
        expect(respuesta.statusCode).toBe(409);
        expect(respuesta.body.error).toContain('Conflicto de Stock');
    });
});