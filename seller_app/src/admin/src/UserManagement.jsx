import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Search, ShieldCheck, ShieldAlert, Store, User } from "lucide-react";
import VerifyCredentialsModal from "./components/modals/VerifyCredentialsModal";
import UserDetailsModal from "./components/modals/UserDetailsModal";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error.message);
    } else {
      setUsers(data || []);
      setFilteredUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (searchQuery) {
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (roleFilter !== "All") {
      result = result.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, users]);

  const handleSuspendToggle = async (user) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    const confirmMsg = `Are you sure you want to ${newStatus === "suspended" ? "SUSPEND" : "ACTIVATE"} ${user.full_name}?`;

    if (window.confirm(confirmMsg)) {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) {
        alert("Error updating status: " + error.message);
      } else {
        fetchUsers();
      }
    }
  };
  // 3. Modal Handlers
  const handleVerifyClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleViewDetails = (user) => {
    setSelectedUserForDetails(user);
    setIsDetailsOpen(true);
  };

  // 4. Update UI after verification (Pass this to VerifyCredentialsModal)
  const onVerificationSuccess = () => {
    fetchUsers(); // Simply refetch to keep data in sync
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 focus:outline-none"
        >
          <option value="All">All Roles</option>
          <option value="Repair Shop">Repair Shop</option>
          <option value="Seller">Seller</option>
        </select>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-500 italic">
            Loading Wasteless Users...
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4 text-center">Transactions</th>
                <th className="px-6 py-4 text-center">Rating</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  // Normalize the role for comparison
                  const role = user.role?.toLowerCase();
                  const isRepairShop =
                    role === "repair shop" || role === "repair_shop";
                  const isHarvester = role === "harvester";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.full_name || "Anonymous User"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-slate-600 capitalize">
                          {isRepairShop ? (
                            <Store size={14} />
                          ) : (
                            <User size={14} />
                          )}
                          {user.role || "User"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_verified ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <ShieldCheck size={14} /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-500 font-medium">
                            <ShieldAlert size={14} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-700">
                        {user.transactions_count || 0}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-700">
                        {user.rating ? `${user.rating} ★` : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Verify Button: Only for unverified Repair Shops OR Harvesters */}
                        {(isRepairShop || isHarvester) && !user.is_verified && (
                          <button
                            onClick={() => handleVerifyClick(user)}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700 font-medium transition"
                          >
                            Verify
                          </button>
                        )}

                        <button
                          onClick={() => handleViewDetails(user)}
                          className="px-3 py-1 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50 font-medium transition"
                        >
                          View
                        </button>

                        <button
                          onClick={() => handleSuspendToggle(user)}
                          className={`px-3 py-1 text-xs rounded-md font-medium text-white transition ${
                            user.status === "suspended"
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {user.status === "suspended"
                            ? "Unsuspend"
                            : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Verification Modal */}
      <VerifyCredentialsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shopData={selectedUser}
        onSuccess={fetchUsers} // This is the "magic" that refreshes the list
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        userData={selectedUserForDetails}
      />
    </div>
  );
};

export default UserManagement;
