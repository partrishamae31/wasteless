import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock3,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  Download,
} from "lucide-react";

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setAdmins(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleApprove = async (adminId) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_status: "verified",
          status: "active",
        })
        .eq("id", adminId);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (adminId) => {
    try {
      const reason = prompt(
        "Enter rejection reason:",
      );

      if (!reason) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: false,
          verification_status: "rejected",
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", adminId);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      fetchAdmins();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingAdmins = admins.filter(
    (item) => item.verification_status === "pending",
  );

  return (
    <div className="p-8 bg-[#F4F6F9] min-h-screen">
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-7">
          <h1 className="text-5xl font-black text-slate-900 text-center">
            {admins.length}
          </h1>

          <p className="text-sm text-slate-500 text-center mt-2">
            Total Admins
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-7">
          <h1 className="text-5xl font-black text-slate-900 text-center">
            {
              admins.filter(
                (a) => a.verification_status === "pending",
              ).length
            }
          </h1>

          <p className="text-sm text-slate-500 text-center mt-2">
            Pending Approvals
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-7">
          <h1 className="text-5xl font-black text-slate-900 text-center">
            {
              admins.filter(
                (a) => a.verification_status === "verified",
              ).length
            }
          </h1>

          <p className="text-sm text-slate-500 text-center mt-2">
            Approved Admins
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-7">
          <h1 className="text-5xl font-black text-slate-900 text-center">
            {
              admins.filter(
                (a) => a.verification_status === "rejected",
              ).length
            }
          </h1>

          <p className="text-sm text-slate-500 text-center mt-2">
            Rejected
          </p>
        </div>
      </div>

      {/* HEADER */}
      <div className="bg-[#EAF6FB] border border-[#B8E1F3] rounded-3xl p-6 flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Admin Registration Approvals
          </h2>

          <p className="text-slate-500 mt-1">
            Review and approve administrator registration requests
          </p>
        </div>

        <button className="bg-[#2387A5] hover:bg-[#1f7690] text-white px-5 py-3 rounded-2xl flex items-center gap-2">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* NOTICE */}
      <div className="bg-[#ECFDF3] border border-[#9FE5BA] rounded-3xl p-5 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
            <Shield className="text-green-600" />
          </div>

          <div>
            <h3 className="font-bold text-green-800 text-lg">
              WMO Approval Required
            </h3>

            <p className="text-green-700 mt-1 text-sm">
              All administrator registrations submitted through the
              registration form require your approval before access
              is granted.
            </p>
          </div>
        </div>
      </div>

      {/* PENDING LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Pending Admin Registrations
            </h2>

            <p className="text-slate-500 mt-1 text-sm">
              Review submitted administrator applications
            </p>
          </div>

          <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold">
            {pendingAdmins.length} Pending
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading admin registrations...
          </div>
        ) : pendingAdmins.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No pending admin registrations
          </div>
        ) : (
          pendingAdmins.map((admin) => (
            <div
              key={admin.id}
              className="p-6 border-b border-slate-100"
            >
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                {/* LEFT */}
                <div className="flex gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <Shield className="text-violet-600" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {admin.full_name}
                    </h2>

                    <p className="text-slate-500 text-sm mt-1">
                      Administrator Account
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={15} />
                        {admin.email}
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={15} />
                        {admin.contact_number}
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <BadgeCheck size={15} />
                        {admin.employee_id || "N/A"}
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={15} />
                        Barangay {admin.barangay}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
                      <Clock3 size={14} />

                      Submitted{" "}
                      {new Date(
                        admin.created_at,
                      ).toLocaleDateString()}
                    </div>

                    {admin.business_permit_url && (
                      <a
                        href={admin.business_permit_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-4 text-[#2387A5] font-semibold text-sm hover:underline"
                      >
                        View Uploaded ID
                      </a>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      handleApprove(admin.id)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      handleReject(admin.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminManagement;