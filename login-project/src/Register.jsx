import React, { useState } from 'react';

const Register = () => {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ nombre, apellidos, email, password, rememberMe });
  };

  const handleGoogleLogin = () => {
    alert('Iniciando sesión con Google...');
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGradient}>
        <div style={styles.mainCard}>
          <div style={styles.logoCard}>
            <div style={styles.logoSquare}>
              {/* IMAGEN DE FONDO MÁS GRANDE */}
              <img 
                src="/img/fondo.jpg"  // ← Tu imagen de fondo
                alt="Fondo tarjeta" 
                style={styles.fullBackground}
              />
              
              {/* LOGO MÁS GRANDE ENCIMA */}
              <div style={styles.logoContainer}>
                <img 
                  src="/img/LogoQNTROL 3.png"  // ← Tu logo
                  alt="Logo" 
                  style={styles.logoOnTop}
                />
              </div>
            </div>
          </div>
          
          <div style={styles.formSection}>
            <h1 style={styles.mainTitle}>Crea una cuenta</h1>
            <p style={styles.registerText}>
              ¿Ya tienes una cuenta? <a href="#" style={styles.registerLink}>Haz clic aquí</a>.
            </p>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Campo Nombre */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  style={styles.inputField}
                  required
                />
              </div>
              
              {/* Campo Apellidos */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Apellidos</label>
                <input
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Tus apellidos"
                  style={styles.inputField}
                  required
                />
              </div>
              
              {/* Campo Email */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  style={styles.inputField}
                  required
                />
              </div>
              
              {/* Campo Contraseña */}
              <div style={styles.fieldContainer}>
                <label style={styles.fieldLabel}>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.inputField}
                  required
                />
                
                {/* Enlace olvidar contraseña */}
                <div style={styles.passwordOptions}>
                  <a href="#" style={styles.forgotLink}>
                    He olvidado mi contraseña
                  </a>
                </div>
              </div>
              
              {/* Botón Continuar */}
              <button type="submit" style={styles.submitButton}>
                Continuar
              </button>
            </form>
            
            {/* Separador con texto "O registrate con" */}
            <div style={styles.orSeparator}>
              <div style={styles.orLine}></div>
              <span style={styles.orText}>O registrate con</span>
              <div style={styles.orLine}></div>
            </div>
            
            {/* Botón Google */}
            <button 
              type="button" 
              style={styles.googleButton}
              onClick={handleGoogleLogin}
            >
              <div style={styles.googleButtonContent}>
                <svg style={styles.googleIcon} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span style={styles.googleText}>Google</span>
              </div>
            </button>
            
            {/* Separador */}
            <div style={styles.separator}></div>
            
            {/* Texto del footer - CORREGIDO: "sin correlaciones" */}
            <div style={styles.footer}>
              <h2 style={styles.footerTitle}>Control</h2>
              <p style={styles.footerText}>
                Gestiona accesos de forma rápida, segura y sin correlaciones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent'
  },
  
  backgroundGradient: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #3B1C57 0%, #803DBD 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    margin: 0
  },
  
  mainCard: {
    backgroundColor: '#2B2738',
    borderRadius: '24px',
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    minHeight: '750px',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
  },
  
  logoCard: {
    flex: 1.2,
    padding: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  
  logoSquare: {
    width: '380px',
    height: '380px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden'
  },
  
  fullBackground: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '16px',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1
  },
  
  logoContainer: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '250px',
    height: '250px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    backdropFilter: 'blur(6px)',
    border: '2px solid rgba(255, 255, 255, 0.25)'
  },
  
  logoOnTop: {
    width: '200px',
    height: '200px',
    objectFit: 'contain',
    borderRadius: '10px'
  },
  
  formSection: {
    flex: 1,
    padding: '70px 60px',
    backgroundColor: '#2B2738'
  },
  
  mainTitle: {
    fontSize: '38px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 15px 0',
    lineHeight: '1.2'
  },
  
  registerText: {
    fontSize: '16px',
    color: '#AAAAAA',
    margin: '0 0 40px 0',
    lineHeight: '1.5'
  },
  
  registerLink: {
    color: '#973685',
    textDecoration: 'none',
    fontWeight: '500'
  },
  
  form: {
    width: '100%'
  },
  
  fieldContainer: {
    marginBottom: '25px'
  },
  
  fieldLabel: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: '10px'
  },
  
  inputField: {
    width: '100%',
    padding: '16px 18px',
    fontSize: '16px',
    border: '2px solid #4B5563',
    borderRadius: '10px',
    backgroundColor: '#374151',
    color: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box'
  },
  
  passwordOptions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px'
  },
  
  forgotLink: {
    fontSize: '14px',
    color: '#973685',
    textDecoration: 'none',
    fontWeight: '500'
  },
  
  submitButton: {
    width: '100%',
    padding: '18px',
    fontSize: '17px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#973685',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '10px',
    marginBottom: '25px'
  },
  
  // Separador "O registrate con"
  orSeparator: {
    display: 'flex',
    alignItems: 'center',
    margin: '25px 0'
  },
  
  orLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#4B5563'
  },
  
  orText: {
    padding: '0 15px',
    color: '#9CA3AF',
    fontSize: '14px',
    fontWeight: '500'
  },
  
  // Botón Google
  googleButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#4285F4',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginBottom: '30px'
  },
  
  googleButtonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  
  googleIcon: {
    width: '22px',
    height: '22px'
  },
  
  googleText: {
    fontSize: '16px',
    fontWeight: '600'
  },
  
  separator: {
    height: '1px',
    backgroundColor: '#4B5563',
    margin: '25px 0 30px 0',
    width: '100%'
  },
  
  footer: {
    textAlign: 'left'
  },
  
  footerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 10px 0'
  },
  
  footerText: {
    fontSize: '14px',
    color: '#9CA3AF',
    lineHeight: '1.6',
    margin: '0'
  }
};

export default Register;