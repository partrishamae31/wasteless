import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Store,
  User,
  Star,
  Filter,
  Users,
  Activity,
  BadgeCheck,
  Database,
} from "lucide-react";

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
  const [selectedUserForDetails, setSelectedUserForDetails] =
    useState(null);

  const fetchUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error.message);
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
          u.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          u.email
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      );
    }

    if (roleFilter !== "All") {
      result = result.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, users]);

  const handleSuspendToggle = async (user) => {
    const newStatus =
      user.status === "active" ? "suspended" : "active";

    if (
      window.confirm(
        `Are you sure you want to ${
          newStatus === "suspended" ? "SUSPEND" : "ACTIVATE"
        } ${user.full_name}?`,
      )
    ) {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) {
        alert(error.message);
      } else {
        fetchUsers();
      }
    }
  };

  const handleVerifyClick = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleViewDetails = (user) => {
    setSelectedUserForDetails(user);
    setIsDetailsOpen(true);
  };

  // DASHBOARD COUNTS
  const totalUsers = users.length;
  const activeListings = users.filter(
    (u) => u.status === "active",
  ).length;

  const verifiedUsers = users.filter(
    (u) => u.is_verified,
  ).length;

  const totalTransactions = users.reduce(
    (acc, user) => acc + (user.transactions_count || 0),
    0,
  );

  const pendingUsers = users.filter(
    (u) => !u.is_verified,
  );

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-800">
          User Management
        </h1>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={<Users size={18} />}
          color="text-blue-500"
        />

        <StatCard
          title="Active Listings"
          value={activeListings}
          icon={<Activity size={18} />}
          color="text-emerald-500"
        />

        <StatCard
          title="Verified Shops"
          value={verifiedUsers}
          icon={<BadgeCheck size={18} />}
          color="text-violet-500"
        />

        <StatCard
          title="Devices Cataloged"
          value={totalTransactions}
          icon={<Database size={18} />}
          color="text-orange-500"
        />
      </div>

      {/* PENDING REQUESTS */}
      <div className="mt-6 rounded-2xl border border-orange-100 bg-[#fff7ed] p-5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-500 p-2 text-white">
            <ShieldAlert size={16} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {pendingUsers.length} Pending Verification Requests
            </h2>

            <p className="text-xs text-slate-500">
              Repair shops are waiting for credential verification
            </p>
          </div>
        </div>
      </div>

      {/* PENDING CARDS */}
      <div className="mt-4 space-y-4">
        {pendingUsers.slice(0, 3).map((user) => (
          <div
            key={user.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
                    <Store size={16} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {user.full_name}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleVerifyClick(user)}
                    className="rounded-lg bg-[#0f766e] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#115e59]"
                  >
                    Review Application
                  </button>

                  <button className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                    Dismiss
                  </button>
                </div>
              </div>

              <button className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* SEARCH */}
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 focus:bg-white"
            />
          </div>

          {/* ROLE FILTER */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Repair Shop">Repair Shop</option>
            <option value="Seller">Seller</option>
          </select>
        </div>

        {/* FILTER BUTTONS */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            <Filter size={14} />
            All Verification Status
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Date: Newest First
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Transactions: Default
          </button>

          <button className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Rating: Default
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mt-5 flex gap-6 border-b border-slate-100 pb-4 text-xs">
          <div>
            <span className="font-semibold text-slate-700">
              {totalUsers}
            </span>{" "}
            <span className="text-slate-500">Total Users</span>
          </div>

          <div>
            <span className="font-semibold text-emerald-600">
              {verifiedUsers}
            </span>{" "}
            <span className="text-slate-500">Verified</span>
          </div>

          <div>
            <span className="font-semibold text-orange-500">
              {pendingUsers.length}
            </span>{" "}
            <span className="text-slate-500">
              Pending Verification
            </span>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-4 font-semibold">User</th>
                <th className="px-2 py-4 font-semibold">Role</th>
                <th className="px-2 py-4 font-semibold">
                  Date Joined
                </th>
                <th className="px-2 py-4 font-semibold">
                  Verification
                </th>
                <th className="px-2 py-4 font-semibold">
                  Transactions
                </th>
                <th className="px-2 py-4 font-semibold">
                  Rating
                </th>
                <th className="px-2 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const role = user.role?.toLowerCase();

                  const isRepairShop =
                    role === "repair shop" ||
                    role === "repair_shop";

                  const isHarvester = role === "harvester";

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 text-sm transition hover:bg-slate-50"
                    >
                      {/* USER */}
                      <td className="px-2 py-5">
                        <div className="font-medium text-slate-800">
                          {user.full_name || "Anonymous"}
                        </div>

                        <div className="text-xs text-slate-400">
                          {user.email}
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="px-2 py-5">
                        <div className="flex items-center gap-2 text-slate-600">
                          {isRepairShop ? (
                            <Store
                              size={14}
                              className="text-emerald-500"
                            />
                          ) : (
                            <User
                              size={14}
                              className="text-sky-500"
                            />
                          )}

                          <span>{user.role || "User"}</span>
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="px-2 py-5 text-slate-500">
                        {user.created_at
                          ? new Date(
                              user.created_at,
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* VERIFICATION */}
                      <td className="px-2 py-5">
                        {user.is_verified ? (
                          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                            <ShieldCheck size={14} />
                            Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                            <ShieldAlert size={14} />
                            Pending
                          </div>
                        )}
                      </td>

                      {/* TRANSACTIONS */}
                      <td className="px-2 py-5 text-slate-600">
                        {user.transactions_count || 0}
                      </td>

                      {/* RATING */}
                      <td className="px-2 py-5">
                        {user.rating ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            {user.rating}

                            <Star
                              size={13}
                              className="fill-yellow-400 text-yellow-400"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            N/A
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-2 py-5">
                        <div className="flex justify-end gap-2">
                          {(isRepairShop || isHarvester) &&
                            !user.is_verified && (
                              <button
                                onClick={() =>
                                  handleVerifyClick(user)
                                }
                                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                              >
                                Verify
                              </button>
                            )}

                          <button
                            onClick={() =>
                              handleViewDetails(user)
                            }
                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() =>
                              handleSuspendToggle(user)
                            }
                            className={`rounded-lg px-4 py-1.5 text-xs font-medium text-white ${
                              user.status === "suspended"
                                ? "bg-sky-500 hover:bg-sky-600"
                                : "bg-red-500 hover:bg-red-600"
                            }`}
                          >
                            {user.status === "suspended"
                              ? "Unsuspend"
                              : "Suspend"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="py-10 text-center text-slate-400"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <VerifyCredentialsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shopData={selectedUser}
        onSuccess={fetchUsers}
      />

      <UserDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        userData={selectedUserForDetails}
      />
    </div>
  );
};

/* =========================
   REUSABLE STAT CARD
========================= */
const StatCard = ({ title, value, icon, color }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-semibold text-slate-800">
            {value}
          </h2>
        </div>

        <div
          className={`rounded-xl bg-slate-50 p-3 ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;