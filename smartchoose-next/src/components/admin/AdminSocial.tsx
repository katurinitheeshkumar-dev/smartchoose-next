import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { detectPlatform } from '@/lib/utils';
import { Toast } from '@/components/ui/custom/Toast';

interface SocialFormData {
  platform: string;
  url: string;
  icon: string;
}

const initialFormData: SocialFormData = {
  platform: '',
  url: '',
  icon: ''
};

const iconMap: Record<string, string> = {
  'Instagram': 'instagram',
  'Facebook': 'facebook',
  'Youtube': 'youtube',
  'Twitter': 'twitter',
  'Linkedin': 'linkedin',
  'MessageCircle': 'message-circle',
  'Send': 'send',
  'Music': 'music',
  'Globe': 'globe',
  'Github': 'github'
};

export function AdminSocial() {
  const { socialLinks, addSocialLink, updateSocialLink, deleteSocialLink } = useDatabase();
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<typeof socialLinks[0] | null>(null);
  const [formData, setFormData] = useState<SocialFormData>(initialFormData);
  const [detected, setDetected] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, url });
    const platform = detectPlatform(url);
    if (platform) {
      setDetected(platform);
      setFormData(prev => ({ ...prev, url, platform: platform.name, icon: platform.icon }));
    } else {
      setDetected(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLink) {
      updateSocialLink(editingLink.id, formData);
      setToast({ show: true, message: 'Social link updated!' });
    } else {
      addSocialLink(formData);
      setToast({ show: true, message: 'Social link added!' });
    }
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLink(null);
    setFormData(initialFormData);
    setDetected(null);
  };

  const handleEdit = (link: typeof socialLinks[0]) => {
    setEditingLink(link);
    setFormData({
      platform: link.platform,
      url: link.url,
      icon: link.icon
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    deleteSocialLink(id);
    setDeleteConfirm(null);
    setToast({ show: true, message: 'Social link deleted!' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Social Media</h1>
          <p className="text-slate-500">Manage your social media links</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
        >
          <Icon name="plus" size={20} />
          Add Link
        </button>
      </div>

      {/* Social Links Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {socialLinks.map(link => (
          <div
            key={link.id}
            className="bg-white rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white">
                <Icon name={iconMap[link.icon] || 'link'} size={24} />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  onClick={() => handleEdit(link)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Icon name="edit" size={18} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(link.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Icon name="trash-2" size={18} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{link.platform}</h3>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:underline truncate block"
            >
              {link.url}
            </a>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {socialLinks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Icon name="share-2" size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No social links added yet</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingLink ? 'Edit Social Link' : 'Add Social Link'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Profile URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    placeholder="https://instagram.com/username"
                  />
                  {detected && (
                    <p className="text-emerald-600 text-sm mt-2 flex items-center gap-1">
                      <Icon name="check-circle" size={16} />
                      Detected: {detected.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Platform Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    placeholder="Instagram"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-6 py-2 rounded-xl text-white font-semibold"
                  >
                    {editingLink ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Icon name="alert-circle" size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Link?</h3>
                <p className="text-slate-500">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </div>
  );
}

export default AdminSocial;
