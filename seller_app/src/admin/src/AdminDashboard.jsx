import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Users, Database, FileText, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 1248, listings: 342, transactions: 285 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
  const fetchStats = async () => {
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: listCount, error: listError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    const { count: transactionCount, error: txError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    if (userError || listError || txError) {
      console.error(userError || listError || txError);
      return;
    }

    setStats({
      users: userCount || 0,
      listings: listCount || 0,
      transactions: transactionCount || 0,
    });

    // 👇 chart data stays here OR can be static
    setChartData([
      { name: 'Jan', transactions: 42 },
      { name: 'Feb', transactions: 51 },
      { name: 'Mar', transactions: 60 },
      { name: 'Apr', transactions: 74 },
      { name: 'May', transactions: 68 },
    ]);
  };

  fetchStats();
}, []);

 return (
    <div className="p-8"> {/* Only a padding div, no flex or aside here */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
      </header>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Users', val: stats.users },
          { label: 'Active Users', val: stats.users },
          { label: 'Total Transactions', val: stats.transactions },
          { label: 'Active Listings', val: stats.listings },
          { label: 'Verified Shops', val: 3 },
          { label: 'Devices Cataloged', val: stats.listings }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center border border-slate-100">
            <div className="text-2xl font-bold text-slate-900">{item.val.toLocaleString()}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Transaction Chart */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 mb-8">
        <h2 className="text-lg font-semibold mb-6 text-slate-700">Transaction Volume & Value</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="transactions" fill="#059669" barSize={60} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
    </div>
  );
};

export default AdminDashboard;