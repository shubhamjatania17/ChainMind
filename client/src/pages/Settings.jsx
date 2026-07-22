import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { database, ref, remove, auth, googleProvider } from '../firebase';
import { 
  updateProfile, 
  updatePassword, 
  deleteUser, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { 
  User, 
  Lock, 
  Trash2, 
  ArrowLeft, 
  Check, 
  Loader2, 
  AlertTriangle, 
  Eye,
  EyeOff,
  PackageOpen,
  Info
} from 'lucide-react';

function Settings({ user }) {
  const navigate = useNavigate();

  // Basic Account details state
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState('');
  const [detailsError, setDetailsError] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');


  
  // Re-authentication modal state
  const [reauthType, setReauthType] = useState(''); // 'password' or 'delete'
  const [reauthCallback, setReauthCallback] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Determine auth provider (Google vs Email)
  const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

  // Handle re-authentication wrapper
  const performSensitiveAction = (callback, actionType) => {
    return async (...args) => {
      try {
        await callback(...args);
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          setReauthType(actionType);
          setReauthCallback(() => () => callback(...args));
          setCurrentPassword('');
          setReauthError('');
        } else {
          throw err;
        }
      }
    };
  };

  // Re-authenticate user
  const handleReauthenticate = async (e) => {
    if (e) e.preventDefault();
    setReauthError('');
    setIsReauthenticating(true);

    try {
      if (isGoogleUser) {
        await reauthenticateWithPopup(auth.currentUser, googleProvider);
      } else {
        if (!currentPassword) {
          setReauthError('Please enter your current password.');
          setIsReauthenticating(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      const callbackToRun = reauthCallback;
      setReauthType('');
      setReauthCallback(null);
      setIsReauthenticating(false);
      
      if (callbackToRun) {
        await callbackToRun();
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setReauthError('Incorrect password. Please try again.');
      } else {
        setReauthError(err.message || 'Re-authentication failed.');
      }
      setIsReauthenticating(false);
    }
  };

  // Update Account Details
  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setDetailsError('');
    setDetailsSuccess('');
    setIsUpdatingDetails(true);

    try {
      await updateProfile(auth.currentUser, { displayName });
      setDetailsSuccess('Account details updated successfully.');
    } catch (err) {
      console.error(err);
      setDetailsError(err.message || 'Failed to update account details.');
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  // Update Password
  const updatePasswordAction = async () => {
    setIsUpdatingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setIsUpdatingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      setPasswordSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    performSensitiveAction(updatePasswordAction, 'password')();
  };



  // Account Deletion Action
  const deleteAccountAction = async () => {
    setIsDeleting(true);
    setDeleteError('');

    try {
      const userRef = ref(database, `users/${user.uid}`);
      await remove(userRef);

      await deleteUser(auth.currentUser);

      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      throw err;
    }
  };

  const handleDeleteAccount = (e) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }
    setDeleteError('');
    performSensitiveAction(deleteAccountAction, 'delete')();
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[150px]"></div>
      </div>

      {/* Recaptcha container */}
      <div id="recaptcha-container" className="hidden"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="h-10 w-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
               <PackageOpen className="h-6 w-6 text-white" />
            </Link>
            <h1 className="text-xl font-bold text-white font-display tracking-tight">ChainMind</h1>
          </div>
          <div>
            <Link 
              to="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white font-display">User Settings</h2>
          <p className="text-slate-400 mt-1 text-sm">Manage your account profile, credentials, and multi-factor security.</p>
        </div>

        <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Card: Basic Details */}
            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
              
              <h3 className="text-xl font-bold text-white font-display flex items-center space-x-2.5 mb-6">
                <User className="h-5 w-5 text-blue-400" />
                <span>Account Profile</span>
              </h3>

              <form onSubmit={handleUpdateDetails} className="space-y-6 max-w-lg">
                {detailsError && (
                  <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-sm text-red-400">
                    {detailsError}
                  </div>
                )}
                {detailsSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/50 p-3 rounded-lg text-sm text-emerald-400 flex items-center space-x-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{detailsSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="appearance-none block w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="appearance-none block w-full px-4 py-3 border border-white/10 rounded-xl bg-black/10 text-slate-400 cursor-not-allowed sm:text-sm opacity-60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Sign-in provider: <span className="font-semibold text-slate-300 capitalize">{isGoogleUser ? 'Google' : 'Email/Password'}</span>
                  </span>
                  <button
                    type="submit"
                    disabled={isUpdatingDetails}
                    className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                  >
                    {isUpdatingDetails && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Card: Password Change (Only for Email Users) */}
            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none"></div>

              <h3 className="text-xl font-bold text-white font-display flex items-center space-x-2.5 mb-6">
                <Lock className="h-5 w-5 text-indigo-400" />
                <span>Change Password</span>
              </h3>

              {isGoogleUser ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl max-w-lg text-slate-400 text-sm flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-300 mb-1 font-display">Delegated Authentication</p>
                    <p className="text-xs leading-relaxed">Password management is disabled because your account is linked through Google Sign-In. You can manage your security settings inside your Google account dashboard.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                  {passwordError && (
                    <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-sm text-red-400">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/50 p-3 rounded-lg text-sm text-emerald-400 flex items-center space-x-2">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="appearance-none block w-full px-4 pr-10 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="appearance-none block w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                      className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-sm disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                    >
                      {isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Change Password</span>
                    </button>
                  </div>
                </form>
              )}
            </div>



            {/* Card: Danger Zone */}
            <div className="bg-red-500/5 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-red-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <h3 className="text-xl font-bold text-red-400 font-display flex items-center space-x-2.5 mb-4">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span>Danger Zone</span>
              </h3>

              <div className="max-w-lg space-y-4">
                <p className="text-slate-300 text-sm leading-relaxed">
                  Permanently delete your account and all associated supply chain configurations. This action is irreversible. All of your physical storage locations and logs will be wiped instantly.
                </p>
                <div>
                  <button
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteError('');
                      setIsDeleteModalOpen(true);
                    }}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all text-sm cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

          </div>
      </main>



      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-red-500/20 text-red-400 rounded-2xl mb-4 w-fit">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-display">Delete Account Permanently?</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              This will completely wipe your account and all associated supply chain maps/configurations. This action is absolute and cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-sm text-red-400">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="appearance-none block w-full px-4 py-3 border border-red-500/30 focus:border-red-500/60 rounded-xl bg-black/20 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm transition-all"
                />
              </div>

              <div className="flex gap-3 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-white/10 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Delete Permanently</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-Authentication Modal */}
      {reauthType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-3.5 bg-blue-500/20 text-blue-400 rounded-2xl mb-4 w-fit">
              <Lock className="h-7 w-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-display">Security Verification</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              For security, you must re-authenticate to confirm this sensitive operation.
            </p>

            {reauthError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-sm text-red-400">
                {reauthError}
              </div>
            )}

            {isGoogleUser ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleReauthenticate(null)}
                  disabled={isReauthenticating}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none transition-all disabled:opacity-70 cursor-pointer"
                >
                  {isReauthenticating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm with Google Sign-In'}
                </button>
                <button
                  onClick={() => {
                    setReauthType('');
                    setReauthCallback(null);
                  }}
                  className="w-full py-2.5 px-4 border border-white/10 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <form onSubmit={handleReauthenticate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="appearance-none block w-full px-4 pr-10 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setReauthType('');
                      setReauthCallback(null);
                    }}
                    className="flex-1 py-2.5 px-4 border border-white/10 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReauthenticating || !currentPassword}
                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isReauthenticating && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Confirm Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;

