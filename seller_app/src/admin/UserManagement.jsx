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

import VerifyCredentialsModal from "./src/components/modals/VerifyCredentialsModal";
import UserDetailsModal from "./src/components/modals/UserDetailsModal";
import { scopeQuery } from "./barangayScope";

const UserManagement = ({ adminBarangay }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);

    // BARANGAY COORDINATOR SCOPE: only users registered in this admin's barangay.
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    query = scopeQuery(query, adminBarangay);

    const { data, error } = await query;

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
  }, [adminBarangay]);

  useEffect(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();

      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query),
      );
    }

    if (roleFilter !== "All") {
      result = result.filter(
        (u) => u.role?.toLowerCase() === roleFilter.toLowerCase(),
      );
    }

    if (verificationFilter !== "All") {
      result = result.filter((u) => {
        const status = u.is_verified
          ? "verified"
          : (u.verification_status || "pending").toLowerCase();

        return status === verificationFilter.toLowerCase();
      });
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, verificationFilter, users]);

  const getVerificationState = (user) => {
    if (user?.is_verified || user?.verification_status?.toLowerCase() === "verified") {
      return "verified";
    }

    if (user?.verification_status?.toLowerCase() === "rejected") {
      return "rejected";
    }

    return "pending";
  };

  const getVerificationBadge = (user) => {
    const state = getVerificationState(user);

    if (state === "verified") {
      return {
        label: "Verified",
        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
        icon: <ShieldCheck size={12} />,
      };
    }

    if (state === "rejected") {
      return {
        label: "Unverified",
        className: "bg-red-50 text-red-600 border-red-100",
        icon: <ShieldAlert size={12} />,
      };
    }

    return {
      label: "New User",
      className: "bg-orange-50 text-orange-700 border-orange-100",
      icon: <ShieldAlert size={12} />,
    };
  };

  const getRoleLabel = (role) => {
    const normalizedRole = role?.toLowerCase();

    if (normalizedRole === "repair_shop" || normalizedRole === "repair shop") {
      return "Repair Shop";
    }

    if (normalizedRole === "harvester") {
      return "Tech Harvester";
    }

    if (normalizedRole === "seller") {
      return "Seller";
    }

    return role || "User";
  };

  const handleSuspendToggle = async (user) => {
    const currentStatus = (user.status || "").toLowerCase();

    const newStatus = currentStatus === "active" ? "suspended" : "active";

    const action = currentStatus === "active" ? "SUSPEND" : "ACTIVATE";

    if (
      window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)
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
  const activeListings = users.filter((u) => u.status === "active").length;

  const verifiedUsers = users.filter((u) => u.is_verified).length;

  const totalTransactions = users.reduce(
    (acc, user) => acc + (user.transactions_count || 0),
    0,
  );

  const pendingUsers = users.filter((u) => u.verification_status === "pending");

  const handleDismiss = async (user) => {
    const reason = window.prompt(
      `Reason for rejecting ${user.full_name || "this user's"} verification request (optional):`,
      "",
    );

    if (reason === null) {
      return;
    }

    const confirmed = window.confirm(
      `Reject verification for ${user.full_name || "this user"}?\n\n` +
        `The account will remain unverified and can be reviewed again after the user corrects their credentials.`,
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
        is_verified: false,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    // The reason is intentionally not written to a guessed database column.
    // If a verification_rejection_reason column is added later, this handler
    // can persist `reason` there and the email workflow can use the same value.
    console.info("Verification rejection reason:", reason);

    await fetchUsers();
    alert(
      "Verification rejected. The account remains unverified. " +
        "A correction/resubmission workflow can use the rejection reason once the email/notification service is connected.",
    );
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-slate-800">
          User Management
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          {adminBarangay
            ? `Showing users registered in Barangay ${adminBarangay} only.`
            : "Showing users from all barangays (no barangay assigned to this admin)."}
        </p>
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
              New accounts remain unverified until their credentials are reviewed.
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

                    <p className="text-xs text-slate-500">{user.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-slate-400">
                        {getRoleLabel(user.role)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${getVerificationBadge(user).className}`}
                      >
                        {getVerificationBadge(user).icon}
                        {getVerificationBadge(user).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleVerifyClick(user)}
                    className="rounded-lg bg-[#0f766e] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#115e59]"
                  >
                    Review Application
                  </button>

                  <button
                    onClick={() => handleDismiss(user)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              <button className="text-slate-400 hover:text-slate-600">✕</button>
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
            <option value="harvester">Harvester</option>
            <option value="seller">Seller</option>
            <option value="repair_shop">Repair Shop</option>
          </select>
        </div>

        {/* FILTERS */}
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            <Filter size={14} />
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="bg-transparent outline-none"
              aria-label="Filter by verification status"
            >
              <option value="All">All Verification Status</option>
              <option value="pending">New User / Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Unverified / Rejected</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              setUsers((current) =>
                [...current].sort(
                  (a, b) =>
                    new Date(b.created_at || 0) - new Date(a.created_at || 0),
                ),
              )
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Date: Newest First
          </button>

          <button
            type="button"
            onClick={() =>
              setUsers((current) =>
                [...current].sort(
                  (a, b) =>
                    (b.transactions_count || 0) - (a.transactions_count || 0),
                ),
              )
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Transactions: Highest First
          </button>

          <button
            type="button"
            onClick={() =>
              setUsers((current) =>
                [...current].sort(
                  (a, b) => (b.rating || 0) - (a.rating || 0),
                ),
              )
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Rating: Highest First
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mt-5 flex gap-6 border-b border-slate-100 pb-4 text-xs">
          <div>
            <span className="font-semibold text-slate-700">{totalUsers}</span>{" "}
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
            <span className="text-slate-500">Pending Verification</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-2 py-4 font-semibold">User</th>
                <th className="px-2 py-4 font-semibold">Role</th>
                <th className="px-2 py-4 font-semibold">Date Joined</th>
                <th className="px-2 py-4 font-semibold">Verification</th>
                <th className="px-2 py-4 font-semibold">Transactions</th>
                <th className="px-2 py-4 font-semibold">Rating</th>
                <th className="px-2 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const role = user.role?.toLowerCase();

                  const isRepairShop =
                    role === "repair shop" || role === "repair_shop";

                  const isHarvester = role === "harvester";

                  const isSeller = role === "seller";

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
                            <Store size={14} className="text-emerald-500" />
                          ) : (
                            <User size={14} className="text-sky-500" />
                          )}

                          <span>{getRoleLabel(user.role)}</span>
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="px-2 py-5 text-slate-500">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* VERIFICATION / USER BADGE */}
                      <td className="px-2 py-5">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getVerificationBadge(user).className}`}
                        >
                          {getVerificationBadge(user).icon}
                          {getVerificationBadge(user).label}
                        </div>
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
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-2 py-5">
                        <div className="flex justify-end gap-2">
                          {(isRepairShop || isHarvester || isSeller) &&
                            getVerificationState(user) !== "verified" && (
                              <button
                                onClick={() => handleVerifyClick(user)}
                                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                              >
                                {getVerificationState(user) === "rejected"
                                  ? "Review Again"
                                  : "Verify"}
                              </button>
                            )}

                          <button
                            onClick={() => handleViewDetails(user)}
                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => handleSuspendToggle(user)}
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
                  <td colSpan="7" className="py-10 text-center text-slate-400">
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
        onSuccess={async () => {
          await fetchUsers();
          setIsModalOpen(false);
        }}
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

        <div className={`rounded-xl bg-slate-50 p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  );
};

export default UserManagement;