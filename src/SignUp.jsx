import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Seller'); // Default role
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create the user in Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role, // This saves to user metadata
        },
      },
    });

    if (authError) {
      alert(authError.message);
    } else {
      alert('Success! Please check your email for the confirmation link.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white shadow-lg rounded-2xl border border-gray-100">
      <h2 className="text-3xl font-bold text-green-700 mb-2">Create Account</h2>
      <p className="text-gray-500 mb-6">Join the Wasteless movement in Valenzuela.</p>

      <form onSubmit={handleSignUp} className="space-y-4">
        <input 
          type="text" placeholder="Full Name" 
          className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
          value={fullName} onChange={(e) => setFullName(e.target.value)} required
        />
        <input 
          type="email" placeholder="Email Address" 
          className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
          value={email} onChange={(e) => setEmail(e.target.value)} required
        />
        <input 
          type="password" placeholder="Password" 
          className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
          value={password} onChange={(e) => setPassword(e.target.value)} required
        />

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
          <select 
            className="w-full p-3 border rounded-lg bg-gray-50"
            value={role} onChange={(e) => setRole(e.target.value)}
          >
            <option value="Seller">E-Waste Seller</option>
            <option value="Harvester">Repair Shop / Tech-Harvester</option>
            <option value="Officer">Environmental Officer</option>
          </select>
        </div>

        <button 
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
        >
          {loading ? 'Processing...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default SignUp;