import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import CrearCuenta from './pages/CrearCuenta';
import Evaluacion from './pages/Evaluacion';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/crear-cuenta" element={<CrearCuenta />} />
            <Route path="/evaluacion" element={<Evaluacion />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
