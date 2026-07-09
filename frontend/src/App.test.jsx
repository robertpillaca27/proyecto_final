import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom/vitest'; // Extensión oficial integrada para Vitest

// Simulamos la llamada fetch global del navegador de forma limpia
const fetchSimulado = vi.fn();
global.fetch = fetchSimulado;

describe('Pruebas Unitarias Frontend - Ruraq Maki App', () => {
  
  beforeEach(() => {
    fetchSimulado.mockClear();
  });

  test('Debería mostrar un mensaje informativo claro si el backend está desconectado inicialmente', async () => {
    // Simulamos respuesta vacía de servidor desconectado
    fetchSimulado.mockResolvedValueOnce({
      json: async () => []
    });

    render(<App />);

    const mensajeAdvertencia = await screen.findByText(/No se encontraron anuncios disponibles/i);
    expect(mensajeAdvertencia).toBeInTheDocument();
  });

  test('Debería renderizar la cabecera del entorno de pruebas QA correctamente', () => {
    fetchSimulado.mockResolvedValueOnce({
      json: async () => []
    });

    render(<App />);
    
    expect(screen.getByText('Ruraq Maki')).toBeInTheDocument();
    expect(screen.getByText('Entorno de Pruebas QA')).toBeInTheDocument();
  });

  test('Debería actualizar de forma reactiva el estado al modificar el filtro geográfico por provincia', async () => {
    fetchSimulado.mockResolvedValue({
      json: async () => []
    });

    render(<App />);
    
    const selectorProvincia = document.getElementById('filtro-provincia');
    expect(selectorProvincia).toBeInTheDocument();

    // Simulamos el cambio de filtro que gatilla el useEffect
    fireEvent.change(selectorProvincia, { target: { value: 'Huanta' } });
    expect(selectorProvincia.value).toBe('Huanta');
    
    await waitFor(() => {
      expect(fetchSimulado).toHaveBeenCalledWith(expect.stringContaining('provincia=Huanta'));
    });
  });
});