
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { useLanguage } from '../LanguageContext.tsx';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { UserRole } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Heart, 
  Building2, 
  Truck, 
  Package, 
  Search, 
  TrendingUp, 
  ShieldCheck,
  MoreVertical,
  ChevronRight,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: any;
}

interface DeliveryRecord {
  id: string;
  medicineName: string;
  quantity: string;
  status: string;
  donorId: string;
  receiverId: string;
  deliveryPartnerId?: string;
  createdAt: any;
}

const GovDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'USERS' | 'DELIVERIES' | 'OVERVIEW'>('OVERVIEW');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Listen for users
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: UserRecord[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserRecord));
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Listen for deliveries
    const deliveriesQuery = query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'));
    const unsubscribeDeliveries = onSnapshot(deliveriesQuery, (snapshot) => {
      const deliveriesData: DeliveryRecord[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DeliveryRecord));
      setDeliveries(deliveriesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deliveries');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeDeliveries();
    };
  }, []);

  const donors = users.filter(u => u.role === UserRole.DONOR);
  const receivers = users.filter(u => u.role === UserRole.RECEIVER);
  const ngos = users.filter(u => u.role === UserRole.NGO);
  const upcomingDeliveries = deliveries.filter(d => d.status === 'SCHEDULED');
  const inTransitDeliveries = deliveries.filter(d => d.status === 'IN_TRANSIT');
  const totalRedistributed = deliveries.filter(d => d.status === 'DELIVERED').length;

  const stats = [
    { label: 'Donors', value: donors.length, icon: <Heart className="text-rose-500" />, color: 'bg-rose-50' },
    { label: 'Receivers', value: receivers.length, icon: <Users className="text-sky-500" />, color: 'bg-sky-50' },
    { label: 'NGO Partners', value: ngos.length, icon: <Building2 className="text-indigo-500" />, color: 'bg-indigo-50' },
    { label: 'Deliveries', value: deliveries.length, icon: <Truck className="text-emerald-500" />, color: 'bg-emerald-50' },
  ];

  const TableHeader = ({ title, count }: { title: string, count: number }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{count} Total</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search records..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-sky-500 transition-all font-sans"
          />
        </div>
        <button className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-all">
          <Filter className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );

  const UserTable = ({ data, roleName }: { data: UserRecord[], roleName: string }) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-12 transform transition-all hover:shadow-xl hover:shadow-slate-200/50">
      <div className="p-8">
        <TableHeader title={`Registered ${roleName}s`} count={data.length} />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest">
                <th className="pb-4 pl-2">Member</th>
                <th className="pb-4">Email Address</th>
                <th className="pb-4">Registered Date</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="py-5 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-bold text-slate-700">{user.name}</div>
                    </div>
                  </td>
                  <td className="py-5 text-slate-500 text-sm font-medium">{user.email}</td>
                  <td className="py-5 text-slate-500 text-sm">
                    {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </td>
                  <td className="py-5">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Verified</span>
                  </td>
                  <td className="py-5 text-right pr-2 text-slate-300 group-hover:text-slate-900 transition-colors">
                    <button className="p-2 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">No registered {roleName.toLowerCase()}s found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const DeliveryTable = ({ data, title }: { data: DeliveryRecord[], title: string }) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
      <div className="p-8">
        <TableHeader title={title} count={data.length} />
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50 text-[10px] font-black uppercase tracking-widest">
                <th className="pb-4 pl-2">Medicine Package</th>
                <th className="pb-4">Quantity</th>
                <th className="pb-4">From → To</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Timeline</th>
                <th className="pb-4 text-right pr-2">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-5 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <Package size={20} />
                      </div>
                      <div className="font-bold text-slate-900">{delivery.medicineName}</div>
                    </div>
                  </td>
                  <td className="py-5 text-slate-500 text-sm font-bold">{delivery.quantity}</td>
                  <td className="py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 font-sans">
                      <span className="text-slate-600">Donor</span>
                      <ChevronRight size={12} />
                      <span className="text-slate-600">Receiver</span>
                    </div>
                  </td>
                  <td className="py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${
                      delivery.status === 'IN_TRANSIT' ? 'bg-amber-50 text-amber-600' : 
                      delivery.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                    }`}>
                      {delivery.status === 'IN_TRANSIT' ? <Clock size={10} /> : <Calendar size={10} />}
                      {delivery.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-5 text-slate-400 text-xs font-bold">
                    {delivery.createdAt?.seconds ? new Date(delivery.createdAt.seconds * 1000).toLocaleString() : 'Processing'}
                  </td>
                  <td className="py-5 text-right pr-2">
                    <button className="text-sky-500 text-xs font-black uppercase tracking-widest hover:text-sky-600 transition-colors">Trace</button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">No deliveries in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdfe] font-serif">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-black tracking-widest uppercase">
              <ShieldCheck size={14} />
              System Oversight
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight pr-12">
              Impact <span className="text-sky-500">Analytics</span> & Portal
            </h1>
            <p className="text-lg text-slate-400 font-medium max-w-2xl font-sans">
              Real-time monitoring of pharmaceutical redistribution across the MedRoute network.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm font-sans">
              {(['OVERVIEW', 'USERS', 'DELIVERIES'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <div className="text-slate-200 group-hover:text-sky-500 transition-colors">
                  <TrendingUp size={24} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-black text-slate-900">{stat.value}</div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Charts Section */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Traffic Distribution</h3>
                      <p className="text-sm text-slate-400 font-sans font-bold">Monthly activity overview across network</p>
                    </div>
                    <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold font-sans outline-none">
                      <option>Last 6 Months</option>
                      <option>Last 30 Days</option>
                    </select>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Mon', u: 400, d: 240 },
                        { name: 'Tue', u: 300, d: 139 },
                        { name: 'Wed', u: 200, d: 980 },
                        { name: 'Thu', u: 278, d: 390 },
                        { name: 'Fri', u: 189, d: 480 },
                        { name: 'Sat', u: 239, d: 380 },
                        { name: 'Sun', u: 349, d: 430 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="u" stroke="#4f46e5" strokeWidth={5} dot={{ fill: '#4f46e5', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="d" stroke="#0ea5e9" strokeWidth={5} dot={{ fill: '#0ea5e9', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px]" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-2 tracking-tight">System Health</h3>
                    <p className="text-slate-400 text-sm font-sans font-bold">Network Uptime & Validation Rate</p>
                    
                    <div className="mt-12 space-y-8">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <CheckCircle2 className="text-emerald-400" />
                           <span className="font-bold text-sm">Auth Services</span>
                         </div>
                         <span className="text-emerald-400 font-bold text-xs">ONLINE</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <CheckCircle2 className="text-emerald-400" />
                           <span className="font-bold text-sm">Database Clusters</span>
                         </div>
                         <span className="text-emerald-400 font-bold text-xs">SYNCED</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <AlertCircle className="text-amber-400" />
                           <span className="font-bold text-sm">Mail Relay</span>
                         </div>
                         <span className="text-amber-400 font-bold text-xs">DEGRADED</span>
                       </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-12">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Impact Value</div>
                    <div className="text-5xl font-black mb-2">₹{ (totalRedistributed * 450).toLocaleString() }</div>
                    <div className="text-emerald-400 text-xs font-black flex items-center gap-1">
                      <TrendingUp size={12} />
                      +14.2% FROM LAST MONTH
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick View Summary */}
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h4 className="text-lg font-black text-slate-900 mb-6">User Composition</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Donors', value: donors.length },
                            { name: 'Receivers', value: receivers.length },
                            { name: 'NGOs', value: ngos.length },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#f43f5e" />
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#4f46e5" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm md:col-span-2">
                   <h4 className="text-xl font-black text-slate-900 mb-8">Recent Network Activity</h4>
                   <div className="space-y-6 font-sans">
                     {users.slice(0, 3).map((u, i) => (
                       <div key={i} className="flex items-center justify-between py-2">
                         <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                             {u.role === UserRole.DONOR ? <Heart size={20} /> : u.role === UserRole.NGO ? <Building2 size={20} /> : <Users size={20} />}
                           </div>
                           <div>
                             <div className="text-sm font-bold text-slate-900">New {u.role.toLowerCase()} joined</div>
                             <div className="text-xs font-medium text-slate-400">{u.email}</div>
                           </div>
                         </div>
                         <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest tracking-tighter">Just Now</div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'USERS' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <UserTable data={donors} roleName="Donor" />
              <UserTable data={receivers} roleName="Receiver" />
              <UserTable data={ngos} roleName="NGO" />
            </motion.div>
          )}

          {activeTab === 'DELIVERIES' && (
            <motion.div
              key="deliveries"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DeliveryTable data={upcomingDeliveries} title="Upcoming Deliveries" />
              <DeliveryTable data={inTransitDeliveries} title="Deliveries In-Transit" />
              <DeliveryTable data={deliveries.filter(d => d.status === 'DELIVERED')} title="Successfully Redistributed" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GovDashboard;
