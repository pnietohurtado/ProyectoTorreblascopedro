import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password, rememberMe });
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
            <h1 style={styles.mainTitle}>Iniciar sesión</h1>
            <p style={styles.registerText}>
              ¿No tienes una cuenta? <a href="#" style={styles.registerLink}>Haz clic aquí</a>
            </p>
            
            <form onSubmit={handleSubmit} style={styles.form}>
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
                
                <div style={styles.passwordOptions}>
                  <div style={styles.rememberOption}>
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={styles.checkbox}
                    />
                    <label htmlFor="remember" style={styles.rememberLabel}>
                      Recordarme
                    </label>
                  </div>
                  <a href="#" style={styles.forgotLink}>
                    He olvidado mi contraseña
                  </a>
                </div>
              </div>
              
              <button type="submit" style={styles.submitButton}>
                Continuar
              </button>
            </form>
            
            <div style={styles.separator}></div>
            
            <div style={styles.footer}>
              <h2 style={styles.footerTitle}>Control</h2>
              <p style={styles.footerText}>
                Gestiona accesos de forma rápida, segura y sin complicaciones.
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
    width: '100vw',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    margin: 0,
    padding: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden'
  },
  
  backgroundGradient: {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #3B1C57 0%, #803DBD 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    margin: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  
  mainCard: {
    backgroundColor: '#2B2738',
    borderRadius: '24px',
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    minHeight: '700px',
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
    margin: '0 0 55px 0',
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
    marginBottom: '35px'
  },
  
  fieldLabel: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: '12px'
  },
  
  inputField: {
    width: '100%',
    padding: '18px 20px',
    fontSize: '17px',
    border: '2px solid #4B5563',
    borderRadius: '12px',
    backgroundColor: '#374151',
    color: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box'
  },
  
  passwordOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px'
  },
  
  rememberOption: {
    display: 'flex',
    alignItems: 'center'
  },
  
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '12px',
    accentColor: '#973685',
    cursor: 'pointer'
  },
  
  rememberLabel: {
    fontSize: '15px',
    color: '#D1D5DB',
    cursor: 'pointer'
  },
  
  forgotLink: {
    fontSize: '15px',
    color: '#973685',
    textDecoration: 'none',
    fontWeight: '500'
  },
  
  submitButton: {
    width: '100%',
    padding: '20px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#973685',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  
  separator: {
    height: '2px',
    backgroundColor: '#4B5563',
    margin: '55px 0 35px 0',
    width: '100%'
  },
  
  footer: {
    textAlign: 'left'
  },
  
  footerTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: '0 0 12px 0'
  },
  
  footerText: {
    fontSize: '15px',
    color: '#9CA3AF',
    lineHeight: '1.6',
    margin: '0'
  }
};

export default Login;