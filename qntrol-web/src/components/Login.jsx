import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fondo from '../img/fondo.jpg';
import logoImg from '../img/LogoQNTROL_3.png';
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from '../firebase/auth';
import { useAuth } from '../contexts/authContext'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await doSignInWithEmailAndPassword(email, password);
      console.log('Login exitoso');
      navigate("/"); 
    } catch (error) {
      console.error('Error en login:', error);
      setError(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async (e) => {
    e.preventDefault();
    setError('/');
    setLoading(true);
    
    try {
      await doSignInWithGoogle();
      console.log('Login con Google exitoso');
      navigate('/');
    } catch (error) {
      console.error('Error en login con Google:', error);
      setError(error.message || 'Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  // Verificar si ya está autenticado
  React.useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);


  return (
    <div style={styles.container}>
      <div style={styles.backgroundGradient}>
        <div style={styles.mainCard}>
          <div style={styles.logoCard}>
            <div style={styles.logoSquare}>
              {/* IMAGEN DE FONDO */}
              <img
                src={fondo}
                alt="Fondo tarjeta"
                style={styles.fullBackground}
              />

              {/* OVERLAY for Logo and Text */}
              <div style={styles.contentOverlay}>
                <div style={styles.logoContainer}>
                  <img
                    src={logoImg}
                    alt="Logo"
                    style={styles.logoOnTop}
                  />
                </div>
                <h1 style={styles.logoBrandName}>Qntrol</h1>
              </div>

              {/* Footer text inside image */}
              <p style={styles.imageFooterText}>
                Gestiona accesos de forma rápida, segura y sin correlaciones.
              </p>
            </div>
          </div>

          <div style={styles.formSection}>
            <h1 style={styles.mainTitle}>Iniciar sesión</h1>
            <p style={styles.registerText}>
              ¿No tienes una cuenta? <Link to="/register" style={styles.registerLink}>Haz clic aquí</Link>
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
    padding: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B2738'
  },

  logoSquare: {
    width: '450px',
    height: '550px',
    borderRadius: '24px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  fullBackground: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    filter: 'brightness(0.8)'
  },

  contentOverlay: {
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '40px'
  },

  logoContainer: {
    width: '120px',
    height: '120px',
    marginBottom: '15px',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
  },

  logoOnTop: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },

  logoBrandName: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    margin: 0,
    letterSpacing: '0.5px'
  },

  imageFooterText: {
    position: 'absolute',
    bottom: '30px',
    left: '0',
    right: '0',
    textAlign: 'center',
    color: '#D1D5DB',
    fontSize: '13px',
    zIndex: 2,
    padding: '0 20px'
  },

  formSection: {
    flex: 1,
    padding: '70px 60px',
    backgroundColor: '#2B2738',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
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
    backgroundColor: '#3B364C', // Color updated here too
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
  }
};

export default Login;