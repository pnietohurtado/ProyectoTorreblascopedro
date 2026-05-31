import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';
import { doDeleteAccount, doDeleteGoogleAccount, doSignOut, doUpdatePassword } from '../firebase/auth';
import AppModal from './AppModal';

const passwordChecks = [
  { label: 'Mínimo 8 caracteres', test: (value) => value.length >= 8 },
  { label: 'Una mayúscula', test: (value) => /[A-Z]/.test(value) },
  { label: 'Una minúscula', test: (value) => /[a-z]/.test(value) },
  { label: 'Un número', test: (value) => /\d/.test(value) },
  { label: 'Un carácter especial', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

const isStrongPassword = (value) => passwordChecks.every((check) => check.test(value));

const ProfilePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
  const userEmail = currentUser?.email || '';
  const userInitial = userName[0].toUpperCase();
  const providerIds = currentUser?.providerData?.map((provider) => provider.providerId) || [];
  const usesGoogle = providerIds.includes('google.com');
  const usesPassword = providerIds.includes('password');

  const resetFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setDeletePassword('');
    setConfirmDelete(false);
  };

  const handleSignOut = async () => {
    await doSignOut();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage({ title: 'Faltan datos', body: 'Introduce tu contraseña actual y la nueva contraseña.' });
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage({ title: 'Contraseña débil', body: 'La nueva contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.' });
      return;
    }

    setLoading(true);
    try {
      await doUpdatePassword(currentPassword, newPassword);
      resetFields();
      setMessage({ title: 'Contraseña actualizada', body: 'Tu contraseña se ha cambiado correctamente.' });
    } catch (error) {
      setMessage({ title: 'No se pudo cambiar', body: 'Revisa tu contraseña actual. Si accediste con Google, esta acción debe hacerse desde tu cuenta de Google.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (usesGoogle && !usesPassword) {
      setLoading(true);
      try {
        await doDeleteGoogleAccount();
        navigate('/login');
      } catch (error) {
        setMessage({ title: 'No se pudo eliminar', body: 'No se completó la confirmación con Google. Inténtalo de nuevo.' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!deletePassword) {
      setMessage({ title: 'Confirmación necesaria', body: 'Introduce tu contraseña actual para eliminar la cuenta.' });
      return;
    }

    setLoading(true);
    try {
      await doDeleteAccount(deletePassword);
      navigate('/login');
    } catch (error) {
      setMessage({ title: 'No se pudo eliminar', body: 'Revisa tu contraseña actual. Si accediste con Google, elimina la cuenta desde el proveedor o vuelve a autenticarte.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 bg-[#0D0E22] overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl w-full">
        <div className="flex items-center gap-5 text-white mb-10">
          <div className="h-16 w-16 rounded-3xl bg-[#4A236D] flex items-center justify-center text-3xl font-black shadow-2xl shadow-purple-900/50">
            {userInitial}
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-none">Perfil</h1>
            <p className="text-gray-500 text-sm mt-1 font-medium">Gestiona tu cuenta y seguridad</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8">
          <section className="rounded-[2rem] border border-white/5 bg-[#2B2738] p-7 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Cuenta</p>
            <p className="mt-4 text-2xl font-black text-white">{userName}</p>
            <p className="mt-1 text-sm text-gray-400">{userEmail}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-7 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </section>

          <section className="rounded-[2rem] border border-white/5 bg-[#2B2738] p-7 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300">Seguridad</p>
            <h2 className="mt-2 text-2xl font-black text-white">Cambiar contraseña</h2>
            {usesPassword ? (
              <div className="mt-6 grid gap-4">
                <input className="rounded-2xl border border-white/10 bg-[#1e1b2e] p-4 text-white outline-none focus:border-purple-500" type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <input className="rounded-2xl border border-white/10 bg-[#1e1b2e] p-4 text-white outline-none focus:border-purple-500" type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {passwordChecks.map((check) => {
                    const passed = check.test(newPassword);
                    return <span key={check.label} className={passed ? 'font-bold text-green-300' : 'text-gray-500'}>{passed ? '✓' : '•'} {check.label}</span>;
                  })}
                </div>
                <button type="button" onClick={handleChangePassword} disabled={loading} className="rounded-2xl bg-[#7738B0] px-5 py-4 text-sm font-black text-white transition hover:bg-[#602c8c] disabled:opacity-60">
                  Cambiar contraseña
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm leading-6 text-gray-300">
                  Has iniciado sesión con Google. La contraseña se gestiona desde tu cuenta de Google, no desde Qntrol.
                </p>
              </div>
            )}
          </section>

          <section className="xl:col-span-2 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-7 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Zona sensible</p>
            <h2 className="mt-2 text-2xl font-black text-white">Eliminar cuenta</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/80">
              Esta acción elimina tu acceso a Qntrol y no se puede deshacer. {usesGoogle && !usesPassword ? 'Te pediremos confirmación con Google.' : 'Introduce tu contraseña actual para confirmar.'}
            </p>
            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              {(!usesGoogle || usesPassword) && (
                <input className="flex-1 rounded-2xl border border-red-300/20 bg-[#1e1b2e] p-4 text-white outline-none focus:border-red-400" type="password" placeholder="Contraseña actual" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              )}
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-2xl bg-red-500 px-6 py-4 text-sm font-black text-white transition hover:bg-red-600">
                {usesGoogle && !usesPassword ? 'Confirmar con Google' : 'Eliminar cuenta'}
              </button>
            </div>
          </section>
        </div>
      </div>

      <AppModal
        open={confirmDelete}
        title="Eliminar cuenta"
        variant="danger"
        confirmLabel="Eliminar definitivamente"
        showCancel
        loading={loading}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAccount}
      >
        <p>{usesGoogle && !usesPassword ? 'Se abrirá Google para confirmar tu identidad antes de eliminar la cuenta.' : 'Se cerrará tu sesión y se eliminará la cuenta de acceso. Confirma solo si estás completamente seguro.'}</p>
      </AppModal>

      <AppModal open={Boolean(message)} title={message?.title || ''} confirmLabel="Aceptar" onClose={() => setMessage(null)}>
        <p>{message?.body}</p>
      </AppModal>
    </div>
  );
};

export default ProfilePage;
