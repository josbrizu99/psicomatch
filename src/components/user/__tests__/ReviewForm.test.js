import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReviewForm from '../ReviewForm';

// Mock de reviewService
jest.mock('../../services/reviewService', () => ({
  createReview: jest.fn()
}));

// Mock de react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

describe('ReviewForm Component', () => {
  const mockProps = {
    professionalId: 'prof123',
    userId: 'user123',
    sessionId: 'session123',
    onSuccess: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar correctamente', () => {
    render(<ReviewForm {...mockProps} />);
    
    expect(screen.getByText('Calificar Profesional')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cuéntanos sobre tu experiencia/i)).toBeInTheDocument();
  });

  it('debería mostrar error si no se selecciona rating', async () => {
    render(<ReviewForm {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Cuéntanos sobre tu experiencia/i);
    fireEvent.change(textarea, { target: { value: 'Muy buena experiencia' } });
    
    const submitButton = screen.getByText('Enviar Reseña');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Por favor selecciona una calificación/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar error si el comentario es muy corto', async () => {
    render(<ReviewForm {...mockProps} />);
    
    // Seleccionar 5 estrellas
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[4]);
    
    // Escribir comentario corto
    const textarea = screen.getByPlaceholderText(/Cuéntanos sobre tu experiencia/i);
    fireEvent.change(textarea, { target: { value: 'Bien' } });
    
    const submitButton = screen.getByText('Enviar Reseña');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/debe tener al menos 10 caracteres/i)).toBeInTheDocument();
    });
  });

  it('debería actualizar contador de caracteres', () => {
    render(<ReviewForm {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Cuéntanos sobre tu experiencia/i);
    fireEvent.change(textarea, { target: { value: 'Test' } });
    
    expect(screen.getByText('4/500 caracteres')).toBeInTheDocument();
  });
});
