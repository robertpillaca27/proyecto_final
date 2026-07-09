import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom/vitest';

// Base de datos simulada en memoria para la integración del cliente
let baseDatosMock = [
  { 
    id: 1, 
    nombre: "Retablo Ayacuchano Especial QA", 
    provincia: "Huamanga", 
    precio: 150.00, 
    stock: 2, 
    categoria: "Retablos",
    vendedor: "Taller Integración"
  }
];

// Configuración del motor fetch para actuar como un servidor espejo integrado
const mockupFetchIntegrado = vi.fn((url, opciones) => {
  // Caso 1: Integración del GET (Carga de Catálogo)
  if (!opciones || opciones.method === 'GET') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(baseDatosMock),
    });
  }

  // Caso 2: Integración del POST (Acción de Compra)
  if (opciones && opciones.method === 'POST') {
    const cuerpo = JSON.parse(opciones.body);
    const producto = baseDatosMock.find(p => p.id === cuerpo.productoId);
    
    if (producto && producto.stock >= cuerpo.cantidad) {
      producto.stock -= cuerpo.cantidad; // Mutación del estado del inventario
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          producto: producto.nombre,
          stockRemanente: producto.stock
        }),
      });
    }
  }
  
  return Promise.reject(new Error('Ruta no integrada en la simulación'));
});

global.fetch = mockupFetchIntegrado;

describe('💥 PRUEBA DE INTEGRACIÓN HORIZONTAL - FRONTEND (UI & STATE)', () => {

  beforeEach(() => {
    mockupFetchIntegrado.mockClear();
    // Reestablecemos el stock del flujo integrado
    baseDatosMock[0].stock = 2;
  });

  test('Debería cargar los productos del API, renderizar las tarjetas y actualizar el DOM de forma reactiva al comprar', async () => {
    
    // 1. Montamos la aplicación completa en el entorno JSDOM
    render(<App />);

    // INTEGRACIÓN VERIFICACIÓN 1: Comprobar el disparo inicial del flujo de datos
    await waitFor(() => {
      expect(mockupFetchIntegrado).toHaveBeenCalledWith(expect.stringContaining('/api/artesanias'));
    });

    // El componente procesó el JSON y pintó la tarjeta del Retablo en la pantalla
    const tituloProducto = await screen.findByText("Retablo Ayacuchano Especial QA");
    expect(tituloProducto).toBeInTheDocument();
    
    // El stock inicial se muestra correctamente en el badge de Tailwind
    const indicadorStock = screen.getByText("2 Unidades");
    expect(indicadorStock).toBeInTheDocument();

    // 2. Simulamos la acción del usuario: Clic en el botón "Adquirir Producto"
    const botonAdquirir = screen.getByRole('button', { name: /Adquirir Producto/i });
    fireEvent.click(botonAdquirir);

    // INTEGRACIÓN VERIFICACIÓN 2: Comprobar el envío transaccional del payload por POST
    await waitFor(() => {
      expect(mockupFetchIntegrado).toHaveBeenCalledWith(
        expect.stringContaining('/api/compras'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // 3. Verificación de la Reactividad en la UI: 
    // El banner de éxito aparece arriba con el mensaje de confirmación
    const alertaExito = await screen.findByText(/¡Transacción Exitosa! Has adquirido:/i);
    expect(alertaExito).toBeInTheDocument();

    // El stock de la tarjeta en pantalla bajó automáticamente de 2 a 1 unidad sin recargar la página
    const indicadorStockActualizado = await screen.findByText("1 Unidades");
    expect(indicadorStockActualizado).toBeInTheDocument();
  });
});