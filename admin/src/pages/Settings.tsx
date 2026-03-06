import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetcher, api } from '@/lib/api';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Palette,
  Building2,
  CreditCard,
  Save,
  Upload,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type SettingsTab = 'profile' | 'company' | 'notifications' | 'security' | 'payments' | 'appearance';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ] as const;

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: 'BaoMbao Craft',
    email: 'info@baombaocraft.com',
    phone: '+256 700 123 456',
    address: 'Kampala, Uganda',
    taxId: '',
    logo: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNewInquiry: true,
    emailQuoteAccepted: true,
    emailPaymentReceived: true,
    smsNewInquiry: false,
    smsPaymentReceived: true,
    pushAlerts: true,
  });

  const updateProfile = useMutation({
    mutationFn: (data: typeof profileForm) => api.patch('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile.mutate(profileForm);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Company */}
          {activeTab === 'company' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Company Information</h2>
              <form className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-primary-100 rounded-xl flex items-center justify-center">
                    {companyForm.logo ? (
                      <img
                        src={companyForm.logo}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-primary-700" />
                    )}
                  </div>
                  <button type="button" className="btn btn-secondary flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID / TIN
                    </label>
                    <input
                      type="text"
                      value={companyForm.taxId}
                      onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Company Info
                </button>
              </form>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Email Notifications</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'emailNewInquiry', label: 'New inquiry received' },
                      { key: 'emailQuoteAccepted', label: 'Quote accepted by customer' },
                      { key: 'emailPaymentReceived', label: 'Payment received' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">SMS Notifications</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'smsNewInquiry', label: 'New inquiry received' },
                      { key: 'smsPaymentReceived', label: 'Payment received' },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications[item.key as keyof typeof notifications]}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input type="password" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input type="password" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input type="password" className="input" />
                </div>
                <button type="submit" className="btn btn-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Payments */}
          {activeTab === 'payments' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Payment Settings</h2>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">MTN Mobile Money</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Accept payments via MTN Mobile Money
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success">Connected</span>
                    <button className="text-sm text-primary-700 hover:underline">
                      Configure
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Airtel Money</h3>
                  <p className="text-sm text-gray-600 mb-3">Accept payments via Airtel Money</p>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success">Connected</span>
                    <button className="text-sm text-primary-700 hover:underline">
                      Configure
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Bank Transfer</h3>
                  <p className="text-sm text-gray-600 mb-3">Accept direct bank transfers</p>
                  <button className="btn btn-secondary btn-sm">Setup Bank Account</button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Appearance Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 border-2 border-primary-700 rounded-lg bg-white text-gray-900">
                      Light
                    </button>
                    <button className="px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-900 text-white">
                      Dark
                    </button>
                    <button className="px-4 py-2 border-2 border-gray-200 rounded-lg">
                      System
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Colors
                  </label>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-700 border-2 border-primary-800"></div>
                    <div className="w-10 h-10 rounded-lg bg-accent-500 border-2 border-accent-600"></div>
                    <div className="w-10 h-10 rounded-lg bg-gray-700"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
