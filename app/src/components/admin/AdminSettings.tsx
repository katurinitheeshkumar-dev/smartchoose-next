import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Toast } from '@/components/ui/custom/Toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export function AdminSettings() {
  const { settings, updateSettings } = useDatabase();
  const { user, logout } = useAdmin();
  const navigate = useNavigate();
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [logoTab, setLogoTab] = useState<'url' | 'upload'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const deleteOldLogo = async (url: string) => {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return;
    try {
      console.log("[STORAGE] Attempting to delete old logo:", url);
      const decodedUrl = decodeURIComponent(url);
      const startIdx = decodedUrl.indexOf('/o/') + 3;
      const endIdx = decodedUrl.indexOf('?');
      if (startIdx > 2 && endIdx > startIdx) {
        const path = decodedUrl.substring(startIdx, endIdx);
        const oldRef = ref(storage, path);
        await deleteObject(oldRef);
        console.log("[STORAGE] Old logo deleted successfully");
      }
    } catch (err) {
      console.warn("[STORAGE] Cleanup warning (non-critical):", err);
    }
  };
  
  const uploadLogoFile = async (originalFile: File) => {
    console.log("[STORAGE] Starting upload for:", originalFile.name, "Size:", originalFile.size);
    setIsUploading(true);
    
    let file = originalFile;
    
    // Check if storage is initialized
    if (!storage) {
      console.error("[STORAGE] Firebase Storage not initialized!");
      setToast({ show: true, message: 'Storage Error: Firebase not ready.' });
      setIsUploading(false);
      return;
    }

    try {
      // 1. Delete old logo in background (don't block the upload)
      if (formData.logo) {
        deleteOldLogo(formData.logo).catch(e => console.warn("Background cleanup failed:", e));
      }

      // 2. Upload new logo
      console.log("[STORAGE] Uploading bytes...");
      const fileName = `logos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      
      console.log("[STORAGE] Bytes uploaded, getting URL...");
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log("[STORAGE] Success! Download URL:", downloadURL);

      // 3. Update state
      setFormData(prev => ({ ...prev, logo: downloadURL }));
      setToast({ show: true, message: 'Logo uploaded! Don\'t forget to click Save All Changes.' });
    } catch (err: any) {
      console.error("[STORAGE] Upload failed:", err);
      const errorMsg = err.message || "Unknown storage error";
      setToast({ show: true, message: `Upload Failed: ${errorMsg}` });
      // If it's a permission error, let the user know specifically
      if (err.code === 'storage/unauthorized') {
        alert("Permission Denied: You don't have access to upload images. Please check your admin status.");
      }
    } finally {
      setIsUploading(false);
      console.log("[STORAGE] Upload process ended.");
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} is not an image file`);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert(`${file.name} is too large (max 2MB)`);
      return;
    }
    uploadLogoFile(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(`${file.name} is too large (max 2MB)`);
      return;
    }
    uploadLogoFile(file);
  };

  const handleLogoUrlAdd = () => {
    if (!logoUrlInput.trim()) return;
    setFormData({ ...formData, logo: logoUrlInput });
    setLogoUrlInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      setToast({ show: true, message: 'Please wait for the upload to complete.' });
      return;
    }
    updateSettings(formData);
    setSaved(true);
    setToast({ show: true, message: 'Settings saved successfully!' });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setFormData(settings);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your website configuration</p>
        </div>
        {saved && (
          <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full font-medium">
            <Icon name="check-circle" size={20} />
            Saved successfully
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Icon name="globe" size={20} className="text-emerald-600" />
            General Settings
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Website Name</label>
              <input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Website Logo</label>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="shrink-0 relative w-24 h-24 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden group shadow-sm">
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-3 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Uploading</span>
                    </div>
                  ) : formData.logo ? (
                    <>
                      <img
                        src={formData.logo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          const span = e.currentTarget.parentElement?.querySelector('span');
                          if (span) span.style.display = 'block';
                        }}
                      />
                      <span className="hidden font-bold text-2xl text-slate-400">{formData.logo.slice(0, 2)}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: '' })}
                        className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="trash-2" size={20} className="mb-1" />
                        <span className="text-xs font-medium">Remove</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Icon name="image" size={24} className="mb-1 opacity-50" />
                      <span className="text-xs font-medium">No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLogoTab('upload')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${logoTab === 'upload' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoTab('url')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${logoTab === 'url' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      Logo URL
                    </button>
                  </div>

                  {logoTab === 'upload' && (
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                        isUploading ? 'border-emerald-200 bg-emerald-50/20 cursor-wait' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                      }`}
                      onClick={() => !isUploading && logoFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleLogoDrop}
                    >
                      <input
                        ref={logoFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleLogoFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <p className="text-sm font-medium text-slate-600">{isUploading ? 'Uploading logo...' : 'Click or drag image here'}</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP, SVG up to 2MB</p>
                    </div>
                  )}

                  {logoTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLogoUrlAdd())}
                      />
                      <button
                        type="button"
                        onClick={handleLogoUrlAdd}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm font-medium text-sm shrink-0"
                      >
                        Set Logo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Site URL</label>
              <input
                type="text"
                value={formData.siteUrl}
                onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">About Content</label>
              <textarea
                rows={4}
                value={formData.aboutContent}
                onChange={(e) => setFormData({ ...formData, aboutContent: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Footer Text</label>
              <input
                type="text"
                value={formData.footerContent}
                onChange={(e) => setFormData({ ...formData, footerContent: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Footer Logo URL (White/Transparent)</label>
              <input
                type="text"
                value={formData.footerLogo}
                onChange={(e) => setFormData({ ...formData, footerLogo: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Icon name="mail" size={20} className="text-green-600" />
            Contact Information
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Office Address (for Legal Pages)</label>
              <input
                type="text"
                value={formData.contactAddress}
                onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Support Phone</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>

            <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
              <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-bold">Internal Reference (Not shown on legal pages)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Icon name="share-2" size={20} className="text-blue-600" />
            Social Automation (Job Alerts)
          </h2>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCDefgh..."
                  value={formData.telegramBotToken || ''}
                  onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Get this from @BotFather on Telegram</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telegram Channel ID</label>
                <input
                  type="text"
                  placeholder="@yourchannel or -100123456789"
                  value={formData.telegramChannelId || ''}
                  onChange={(e) => setFormData({ ...formData, telegramChannelId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Your public channel username or private ID</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={formData.whatsappWebhookUrl || ''}
                  onChange={(e) => setFormData({ ...formData, whatsappWebhookUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Zapier/Make.com webhook to bridge to WhatsApp</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Instagram Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={formData.instagramWebhookUrl || ''}
                  onChange={(e) => setFormData({ ...formData, instagramWebhookUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Zapier/Make.com webhook to bridge to Instagram</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700 flex items-start gap-2">
                <Icon name="zap" size={16} className="mt-0.5 flex-shrink-0" />
                <span>When you publish a job, it will automatically be sent to these channels if configured.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Icon name="shopping-bag" size={20} className="text-emerald-600" />
            Social Automation (Product Alerts)
          </h2>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCDefgh..."
                  value={formData.productTelegramBotToken || ''}
                  onChange={(e) => setFormData({ ...formData, productTelegramBotToken: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Get this from @BotFather on Telegram</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product Telegram Channel ID</label>
                <input
                  type="text"
                  placeholder="@yourproductchannel or -100123456789"
                  value={formData.productTelegramChannelId || ''}
                  onChange={(e) => setFormData({ ...formData, productTelegramChannelId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Your public channel username or private ID</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product WhatsApp Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={formData.productWhatsappWebhookUrl || ''}
                  onChange={(e) => setFormData({ ...formData, productWhatsappWebhookUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Zapier/Make.com webhook to bridge products to WhatsApp</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Product Instagram Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={formData.productInstagramWebhookUrl || ''}
                  onChange={(e) => setFormData({ ...formData, productInstagramWebhookUrl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-mono text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">Zapier/Make.com webhook to bridge products to Instagram</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-emerald-700 flex items-start gap-2">
                <Icon name="share-2" size={16} className="mt-0.5 flex-shrink-0" />
                <span>When you broadcast a product, it will automatically use these channel configurations.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Icon name="shield" size={20} className="text-amber-600" />
            Security
          </h2>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900">Admin Account</p>
              <p className="text-sm text-slate-500">Manage your credentials ({user?.email})</p>
            </div>
            <button
              type="button"
              disabled={isResetting || resetEmailSent}
              onClick={async () => {
                if (!user?.email) return;
                setIsResetting(true);
                try {
                  const { sendPasswordResetEmail } = await import('firebase/auth');
                  const { auth } = await import('@/lib/firebase');
                  await sendPasswordResetEmail(auth, user.email);
                  setResetEmailSent(true);
                  setToast({ show: true, message: 'Password reset email sent!' });
                } catch (err) {
                  setToast({ show: true, message: 'Failed to send reset email.' });
                } finally {
                  setIsResetting(false);
                }
              }}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200 transition-colors disabled:opacity-50"
            >
              {resetEmailSent ? 'Email Sent' : isResetting ? 'Sending...' : 'Send Reset Email'}
            </button>
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <Icon name="info" size={16} className="mt-0.5 flex-shrink-0" />
              <span>SmartChoose now uses Firebase Authentication. Password resets are handled securely via your registered email address.</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-all"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all flex items-center gap-2"
          >
            <Icon name="log-out" size={20} />
            Logout
          </button>
          <button
            type="submit"
            className="btn-primary px-8 py-3 rounded-xl text-white font-bold flex items-center gap-2"
          >
            <Icon name="save" size={20} />
            Save All Changes
          </button>
        </div>
      </form>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </div>
  );
}

export default AdminSettings;
